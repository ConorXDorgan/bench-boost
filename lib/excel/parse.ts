import ExcelJS from "exceljs";
import { prisma } from "@/lib/db";
import { deriveAvailability } from "@/lib/excel/availability";
import { FIELD_ALIASES, REQUIRED_COLUMNS, type FieldKey } from "@/lib/excel/columns";

const SNAPSHOT_RETENTION = 10;

interface IngestSummary {
  snapshotId: string;
  snapshotDate: Date;
  resourceCount: number;
  bucketCounts: { available: number; coming: number; not_available: number };
  unknownCount: number;
}

export class IngestError extends Error {
  constructor(message: string, public readonly missingColumns?: string[]) {
    super(message);
    this.name = "IngestError";
  }
}

function cellText(value: ExcelJS.CellValue | undefined): string | null {
  if (value == null) return null;
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object" && value !== null) {
    if ("text" in value && typeof value.text === "string") return value.text.trim() || null;
    if ("richText" in value && Array.isArray((value as ExcelJS.CellRichTextValue).richText)) {
      return (value as ExcelJS.CellRichTextValue).richText
        .map((r) => r.text)
        .join("")
        .trim() || null;
    }
    if ("result" in value) {
      const formula = value as ExcelJS.CellFormulaValue;
      return formula.result == null ? null : cellText(formula.result as ExcelJS.CellValue);
    }
    if ("hyperlink" in value && "text" in value) {
      return (value as ExcelJS.CellHyperlinkValue).text?.toString().trim() || null;
    }
  }
  return null;
}

function cellDate(value: ExcelJS.CellValue | undefined): Date | null {
  if (value == null) return null;
  if (value instanceof Date) return value;
  if (typeof value === "object" && value !== null && "result" in value) {
    const formula = value as ExcelJS.CellFormulaValue;
    return formula.result instanceof Date ? formula.result : null;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

function cellInt(value: ExcelJS.CellValue | undefined): number | null {
  if (value == null) return null;
  if (typeof value === "number") return Math.round(value);
  if (typeof value === "string") {
    const cleaned = value.replace(/[%\s]/g, "");
    if (!cleaned) return null;
    const parsed = Number(cleaned);
    return Number.isNaN(parsed) ? null : Math.round(parsed);
  }
  if (typeof value === "object" && value !== null && "result" in value) {
    return cellInt((value as ExcelJS.CellFormulaValue).result as ExcelJS.CellValue);
  }
  return null;
}

interface ParseRow {
  snapshotDate: Date;
  raw: Record<string, unknown>;
  fields: {
    eid: string;
    fullName: string;
    email: string | null;
    personnelNumber: string | null;
    managementLevel: string | null;
    jobFamily: string | null;
    jobFamilyGroup: string | null;
    orgUnitL4: string | null;
    location: string | null;
    country: string | null;
    metroCity: string | null;
    staffableStatus: string | null;
    staffableDetailedStatus: string | null;
    firstStaffableCategory: string | null;
    availableTimeFlag: string | null;
    firstStaffableDate: Date | null;
    allocationPct: number | null;
    currentClient: string | null;
    currentProject: string | null;
    currentProjectStart: Date | null;
    currentProjectEnd: Date | null;
    rollOffConfirmed: string | null;
    currentComments: string | null;
    skills: string | null;
    specializationsEarned: string | null;
    specializationsBuilding: string | null;
    specializationsAspirational: string | null;
    languages: string | null;
    certifications: string | null;
    workdayUrl: string | null;
  };
}

interface ParseResult {
  snapshotDate: Date;
  rows: ParseRow[];
}

export async function parseWorkbook(buffer: ArrayBuffer | Buffer): Promise<ParseResult> {
  const workbook = new ExcelJS.Workbook();
  const ab = buffer instanceof Buffer
    ? buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
    : buffer;
  await workbook.xlsx.load(ab as ArrayBuffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new IngestError("Workbook has no sheets");

  const headerRow = sheet.getRow(1);
  const colIndex = new Map<string, number>();
  headerRow.eachCell((cell, colNumber) => {
    const name = cellText(cell.value);
    if (name) colIndex.set(name, colNumber);
  });

  const missing = REQUIRED_COLUMNS.filter((c) => !colIndex.has(c));
  if (missing.length > 0) {
    throw new IngestError(
      `Workbook is missing ${missing.length} required column(s): ${missing.join(", ")}`,
      missing,
    );
  }

  // Resolve each logical field to the first matching column in the header.
  // Fields whose aliases are all absent simply yield null at read time.
  const fieldCol: Partial<Record<FieldKey, number>> = {};
  for (const key of Object.keys(FIELD_ALIASES) as FieldKey[]) {
    for (const alias of FIELD_ALIASES[key]) {
      const idx = colIndex.get(alias);
      if (idx != null) {
        fieldCol[key] = idx;
        break;
      }
    }
  }

  const readCell = (row: ExcelJS.Row, key: FieldKey): ExcelJS.CellValue | undefined => {
    const idx = fieldCol[key];
    return idx == null ? undefined : row.getCell(idx).value;
  };
  const txt = (row: ExcelJS.Row, key: FieldKey) => cellText(readCell(row, key));
  const dt = (row: ExcelJS.Row, key: FieldKey) => cellDate(readCell(row, key));
  const num = (row: ExcelJS.Row, key: FieldKey) => cellInt(readCell(row, key));

  const snapshotColIdx = colIndex.get("Snapshot Date")!;
  const snapshotCell = (row: ExcelJS.Row) => row.getCell(snapshotColIdx).value;

  const rows: ParseRow[] = [];
  let snapshotDate: Date | null = null;

  for (let i = 2; i <= sheet.rowCount; i++) {
    const row = sheet.getRow(i);
    if (row.cellCount === 0) continue;

    const eid = txt(row, "eid");
    const fullName = txt(row, "fullName");
    if (!eid || !fullName) continue;

    const rowSnapshotDate = cellDate(snapshotCell(row));
    if (rowSnapshotDate && !snapshotDate) snapshotDate = rowSnapshotDate;

    const raw: Record<string, unknown> = {};
    for (const [name, idx] of colIndex.entries()) {
      const v = row.getCell(idx).value;
      if (v == null) raw[name] = null;
      else if (v instanceof Date) raw[name] = v.toISOString();
      else if (typeof v === "object" && "text" in v && typeof v.text === "string") raw[name] = v.text;
      else if (typeof v === "object" && "richText" in v) raw[name] = cellText(v);
      else raw[name] = v;
    }

    rows.push({
      snapshotDate: rowSnapshotDate ?? snapshotDate ?? new Date(),
      raw,
      fields: {
        eid,
        fullName,
        email: txt(row, "email"),
        personnelNumber: txt(row, "personnelNumber"),
        managementLevel: txt(row, "managementLevel"),
        jobFamily: txt(row, "jobFamily"),
        jobFamilyGroup: txt(row, "jobFamilyGroup"),
        orgUnitL4: txt(row, "orgUnitL4"),
        location: txt(row, "location"),
        country: txt(row, "country"),
        metroCity: txt(row, "metroCity"),
        staffableStatus: txt(row, "staffableStatus"),
        staffableDetailedStatus: txt(row, "staffableDetailedStatus"),
        firstStaffableCategory: txt(row, "firstStaffableCategory"),
        availableTimeFlag: txt(row, "availableTimeFlag"),
        firstStaffableDate: dt(row, "firstStaffableDate"),
        allocationPct: num(row, "allocationPct"),
        currentClient: txt(row, "currentClient"),
        currentProject: txt(row, "currentProject"),
        currentProjectStart: dt(row, "currentProjectStart"),
        currentProjectEnd: dt(row, "currentProjectEnd"),
        rollOffConfirmed: txt(row, "rollOffConfirmed"),
        currentComments: txt(row, "currentComments"),
        skills: txt(row, "skills"),
        specializationsEarned: txt(row, "specializationsEarned"),
        specializationsBuilding: txt(row, "specializationsBuilding"),
        specializationsAspirational: txt(row, "specializationsAspirational"),
        languages: txt(row, "languages"),
        certifications: txt(row, "certifications"),
        workdayUrl: txt(row, "workdayUrl"),
      },
    });
  }

  if (!snapshotDate) {
    snapshotDate = rows[0]?.snapshotDate ?? new Date();
  }

  return { snapshotDate, rows };
}

export async function ingestExcelBuffer(
  buffer: ArrayBuffer | Buffer,
  source: "manual" | "seed",
): Promise<IngestSummary> {
  const { snapshotDate, rows } = await parseWorkbook(buffer);

  const bucketCounts = { available: 0, coming: 0, not_available: 0 };
  let unknownCount = 0;

  const resourceData = rows.map((row) => {
    const availability = deriveAvailability(
      {
        staffableStatus: row.fields.staffableStatus,
        staffableDetailedStatus: row.fields.staffableDetailedStatus,
        firstStaffableCategory: row.fields.firstStaffableCategory,
        firstStaffableDate: row.fields.firstStaffableDate,
      },
      snapshotDate,
    );
    bucketCounts[availability.bucket]++;
    if (availability.unknown) unknownCount++;
    return {
      ...row.fields,
      bucket: availability.bucket,
      unknown: availability.unknown,
      weeksOut: availability.weeksOut,
      cvUrl: null,
      rawJson: JSON.stringify(row.raw),
    };
  });

  const snapshot = await prisma.snapshot.create({
    data: {
      snapshotDate,
      source,
      resources: { create: resourceData },
    },
  });

  const allSnapshots = await prisma.snapshot.findMany({
    orderBy: { snapshotDate: "desc" },
    select: { id: true },
  });
  const stale = allSnapshots.slice(SNAPSHOT_RETENTION).map((s) => s.id);
  if (stale.length > 0) {
    await prisma.snapshot.deleteMany({ where: { id: { in: stale } } });
  }

  return {
    snapshotId: snapshot.id,
    snapshotDate,
    resourceCount: rows.length,
    bucketCounts,
    unknownCount,
  };
}
