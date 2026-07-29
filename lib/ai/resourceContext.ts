import type { ResourceDto } from "@/lib/resourceDto";
import { parseSkillString } from "@/lib/skills";

/**
 * The bench used to be sent as a JSON array of objects. For ~500 people the
 * key names + quotes burned ~120K tokens and we kept blowing the model's
 * context window. We now flatten the staffable bench into a pipe-delimited
 * table — one resource per line, with high-signal fields only.
 *
 * Rough size: ~50-80 tokens per resource vs ~250 in the old JSON form.
 */

const COL_SEP = "|";
const ITEM_SEP = "; ";
/** Cap each resource's listed skills to keep extreme outliers from bloating the prompt. */
const MAX_SKILLS_PER_RESOURCE = 25;
/** Only keep high-signal proficiency levels — those that actually drive staffing decisions. */
const KEEP_LEVELS = new Set(["Master", "Expert", "Advanced"]);

export const BENCH_COLUMNS = [
  "eid",
  "name",
  "lvl",
  "fam",
  "org",
  "loc",
  "bkt",
  "wk",
  "fs",
  "skills",
  "earned",
  "building",
  "langs",
  "certs",
] as const;

/** Header description for the model, explaining each column. */
export const BENCH_FORMAT_DESCRIPTION = `Each row below is pipe-delimited (|) with these columns IN ORDER:
  eid      – Enterprise ID (use verbatim in your output)
  name     – Full name
  lvl      – Management level (lower numbers = more senior at Accenture)
  fam      – Job family
  org      – Org unit (Level 4)
  loc      – Location
  bkt      – Availability bucket: "A" (available now) or "C" (coming available)
  wk       – Weeks until staffable (0 = now, blank = unknown)
  fs       – First staffable date (YYYY-MM-DD; blank if unknown)
  skills   – Top skills only, separated by "; ". Format "Name(Level)" where Level is M=Master, E=Expert, A=Advanced. Intermediate/Beginner skills are intentionally omitted to save space.
  earned   – Earned specialization paths, separated by "; "
  building – Specialization paths in progress, separated by "; "
  langs    – Languages with proficiency, separated by "; "
  certs    – Certifications, separated by "; "
Empty fields appear as two pipes in a row (e.g. "||"). When a field's content contains a pipe, it has been replaced with a slash to keep parsing unambiguous.`;

export interface BenchContext {
  /** Formatted multi-line string ready to drop into the prompt. */
  table: string;
  /** Number of resources included. */
  size: number;
  /** Rough character count (≈ 4 chars per token) for budgeting. */
  approxChars: number;
}

export function buildBenchContext(resources: ResourceDto[]): BenchContext {
  const lines: string[] = [BENCH_COLUMNS.join(COL_SEP)];

  for (const r of resources) {
    if (r.bucket !== "available" && r.bucket !== "coming") continue;

    const skillsCompact = compactSkills(r.skills);
    const cells = [
      r.eid,
      r.fullName,
      r.managementLevel,
      r.jobFamily,
      r.orgUnitL4,
      r.location,
      r.bucket === "available" ? "A" : "C",
      r.weeksOut != null ? String(r.weeksOut) : "",
      r.firstStaffableDate ? r.firstStaffableDate.slice(0, 10) : "",
      skillsCompact,
      compactList(r.specializationsEarned),
      compactList(r.specializationsBuilding),
      compactList(r.languages),
      compactList(r.certifications),
    ].map((c) => sanitiseCell(c));

    lines.push(cells.join(COL_SEP));
  }

  const table = lines.join("\n");
  return {
    table,
    size: lines.length - 1,
    approxChars: table.length,
  };
}

function sanitiseCell(value: string | null | undefined): string {
  if (value == null) return "";
  // Strip pipes from cell content so they don't collide with the field separator.
  return value.replace(/\|/g, "/").replace(/\s+/g, " ").trim();
}

/**
 * Reduce a raw skills blob (potentially hundreds of pipe-delimited skills with
 * proficiency annotations) to the high-signal subset, encoded compactly.
 */
function compactSkills(raw: string | null | undefined): string {
  if (!raw) return "";
  const parsed = parseSkillString(raw);
  const kept = parsed.filter((s) => s.level != null && KEEP_LEVELS.has(s.level));

  // Order by proficiency (Master > Expert > Advanced) then name.
  const order: Record<string, number> = { Master: 0, Expert: 1, Advanced: 2 };
  kept.sort((a, b) => {
    const lo = (order[a.level!] ?? 9) - (order[b.level!] ?? 9);
    if (lo !== 0) return lo;
    return a.name.localeCompare(b.name);
  });

  const top = kept.slice(0, MAX_SKILLS_PER_RESOURCE);
  return top
    .map((s) => `${s.name}(${(s.level ?? "")[0] ?? ""})`)
    .join(ITEM_SEP);
}

/**
 * Normalise a free-form pipe/comma-delimited blob into a clean "a; b; c" list,
 * removing sequence prefixes ("1 - ", "1) ") and collapsing whitespace.
 */
function compactList(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw
    .split(/[|;]/)
    .map((piece) => piece.replace(/^\s*\d+\s*[-.)]\s*/, "").trim())
    .filter(Boolean)
    .join(ITEM_SEP);
}
