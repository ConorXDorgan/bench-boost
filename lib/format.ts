import type { Bucket } from "@/lib/excel/availability";

export const BUCKETS: readonly Bucket[] = ["available", "coming", "not_available"];

export type BucketFilter = Bucket[];

export function toggleBucket(selected: BucketFilter, b: Bucket): BucketFilter {
  return selected.includes(b)
    ? selected.filter((x) => x !== b)
    : BUCKETS.filter((x) => x === b || selected.includes(x));
}

export function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toISOString().slice(0, 10);
}

/**
 * Short-form date for compact table cells. Renders e.g. "30 Jun 27" — day,
 * abbreviated month, 2-digit year. Returns "—" for null / invalid dates.
 */
export function fmtShortDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return "—";
  const day = date.getUTCDate();
  const month = date.toLocaleString("en-GB", { month: "short", timeZone: "UTC" });
  const year = String(date.getUTCFullYear()).slice(-2);
  return `${day} ${month} ${year}`;
}

export function fmtText(s: string | null | undefined): string {
  if (s == null || s === "") return "—";
  return s;
}

export const BUCKET_LABEL: Record<string, string> = {
  available: "Available",
  coming: "Coming Available",
  not_available: "Not Available",
};

// Status pills tuned to the Accenture palette: brand purple is reserved for
// brand moments, so statuses use distinct, accessible neutrals + accents.
export const BUCKET_PILL: Record<string, string> = {
  available:
    "bg-[color:var(--acn-success-50)] text-[#00766a] ring-[color:var(--acn-success)]/30",
  coming:
    "bg-[color:var(--acn-warn-50)] text-[#8a5300] ring-[color:var(--acn-warn)]/30",
  not_available:
    "bg-[color:var(--acn-neutral-50)] text-[#3f3f46] ring-[color:var(--acn-neutral)]/30",
};

export const BUCKET_PILL_UNKNOWN =
  "bg-[color:var(--acn-neutral-50)] text-[#52525b] ring-[color:var(--acn-neutral)]/25 [background-image:repeating-linear-gradient(45deg,transparent,transparent_3px,rgba(0,0,0,0.04)_3px,rgba(0,0,0,0.04)_6px)]";

export const BUCKET_DOT: Record<string, string> = {
  available: "bg-[color:var(--acn-success)]",
  coming: "bg-[color:var(--acn-warn)]",
  not_available: "bg-[color:var(--acn-neutral)]",
};

/* ----------------------------------------------------------------
 * Management level helpers
 * --------------------------------------------------------------- */

/** Strip the "<number>-" prefix off a managementLevel string and return the parts. */
export function parseManagementLevel(raw: string | null | undefined): {
  num: number | null;
  title: string;
} {
  if (!raw) return { num: null, title: "" };
  const match = raw.match(/^(\d+)\s*[-–]\s*(.+)$/);
  if (match) {
    return { num: parseInt(match[1], 10), title: match[2].trim() };
  }
  return { num: null, title: raw.trim() };
}

/**
 * Display-friendly title — abbreviates the longer Accenture titles so they
 * don't blow out the Level column in the table.
 */
export function formatLevelTitle(title: string): string {
  const t = title.trim();
  if (!t) return "—";
  if (t === "Associate Manager") return "Assoc. Manager";
  if (t === "Associate Director") return "Assoc. Director";
  if (t === "Team Lead/Consultant") return "Consultant";
  if (t === "Senior Managing Director") return "Sr. Managing Dir.";
  if (t === "Accenture Leadership") return "Leadership";
  return t;
}

/**
 * Per-level pill colour. Keyed by Accenture's numeric level so adding a new
 * title for an existing level (or vice versa) doesn't change the colour.
 * The styling matches the muted, accessible pill aesthetic used across the app.
 */
export const LEVEL_PILL_BY_NUM: Record<number, string> = {
  5: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  6: "bg-violet-50 text-violet-700 ring-violet-200",
  7: "bg-sky-50 text-sky-700 ring-sky-200",
  8: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  9: "bg-amber-50 text-amber-800 ring-amber-200",
  10: "bg-cyan-50 text-cyan-700 ring-cyan-200",
  11: "bg-slate-50 text-slate-700 ring-slate-200",
  13: "bg-rose-50 text-rose-700 ring-rose-200",
};

export const LEVEL_PILL_DEFAULT = "bg-neutral-100 text-neutral-700 ring-neutral-200";

/**
 * Status text shown in the "Status" column. Prefers the upstream
 * `staffableStatus` value when present, falling back to the derived bucket
 * label so the cell is never empty.
 */
export function formatStatus(opts: {
  staffableStatus: string | null;
  bucket: string;
}): string {
  if (opts.staffableStatus && opts.staffableStatus.trim()) {
    return opts.staffableStatus.trim();
  }
  return BUCKET_LABEL[opts.bucket] ?? "—";
}

/**
 * Friendly version of the firstStaffableCategory used in the "Available"
 * column. Strips the verbose "Resource First Staffable Day " / "Resource
 * First Staffable Day - " upstream prefix and shortens "Weeks" → "wks".
 */
export function formatAvailableCategory(raw: string | null | undefined): string {
  if (!raw) return "—";
  const cleaned = raw
    .replace(/^Resource\s+First\s+Staffable\s+(Day|Date)\s*[-–]?\s*/i, "")
    .replace(/\bWeeks\b/g, "wks")
    .trim();
  return cleaned || "—";
}
