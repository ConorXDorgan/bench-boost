export type Bucket = "available" | "coming" | "not_available";

export interface AvailabilityInput {
  staffableStatus: string | null;
  staffableDetailedStatus: string | null;
  firstStaffableCategory: string | null;
  firstStaffableDate: Date | null;
}

export interface AvailabilityResult {
  bucket: Bucket;
  firstStaffableDate: Date | null;
  weeksOut: number | null;
  unknown: boolean;
}

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;
const COMING_WEEKS_THRESHOLD = 8;

function norm(value: string | null): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function weeksBetween(from: Date, to: Date): number {
  return Math.ceil((to.getTime() - from.getTime()) / MS_PER_WEEK);
}

export function deriveAvailability(
  input: AvailabilityInput,
  now: Date = new Date(),
): AvailabilityResult {
  const status = norm(input.staffableStatus);
  const detailed = norm(input.staffableDetailedStatus);
  const category = norm(input.firstStaffableCategory);
  const date = input.firstStaffableDate;

  const weeksOut =
    date && !Number.isNaN(date.getTime()) ? weeksBetween(now, date) : null;

  if (detailed === "Now Staffable") {
    return { bucket: "available", firstStaffableDate: date, weeksOut, unknown: false };
  }
  if (detailed === "Coming Staffable") {
    return { bucket: "coming", firstStaffableDate: date, weeksOut, unknown: false };
  }
  if (category && category.startsWith("Resource Now Staffable")) {
    return { bucket: "available", firstStaffableDate: date, weeksOut, unknown: false };
  }
  if (
    category &&
    category.startsWith("Resource First Staffable Day") &&
    weeksOut !== null &&
    weeksOut <= COMING_WEEKS_THRESHOLD &&
    weeksOut >= 0
  ) {
    return { bucket: "coming", firstStaffableDate: date, weeksOut, unknown: false };
  }
  if (status === "Not Staffable" || detailed === "Not Staffable") {
    return { bucket: "not_available", firstStaffableDate: date, weeksOut, unknown: false };
  }

  const allMissing = status === null && detailed === null && category === null && date === null;
  return {
    bucket: "not_available",
    firstStaffableDate: date,
    weeksOut,
    unknown: allMissing,
  };
}
