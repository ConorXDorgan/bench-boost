import { NextResponse } from "next/server";
import { IngestError, ingestExcelBuffer } from "@/lib/excel/parse";

const MAX_BYTES = 25 * 1024 * 1024;

export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "Missing 'file' field" }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "Uploaded file is empty" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `File exceeds ${MAX_BYTES / 1024 / 1024}MB limit` },
      { status: 413 },
    );
  }
  const name = "name" in file && typeof file.name === "string" ? file.name : "upload.xlsx";
  if (!name.toLowerCase().endsWith(".xlsx")) {
    return NextResponse.json({ error: "Only .xlsx files are accepted" }, { status: 415 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const summary = await ingestExcelBuffer(buffer, "manual");
    return NextResponse.json({
      ok: true,
      snapshotId: summary.snapshotId,
      snapshotDate: summary.snapshotDate.toISOString().slice(0, 10),
      resourceCount: summary.resourceCount,
      bucketCounts: summary.bucketCounts,
    });
  } catch (err) {
    if (err instanceof IngestError) {
      return NextResponse.json(
        { error: err.message, missingColumns: err.missingColumns },
        { status: 400 },
      );
    }
    console.error("Upload ingest failed:", err);
    return NextResponse.json({ error: "Failed to process workbook" }, { status: 500 });
  }
}
