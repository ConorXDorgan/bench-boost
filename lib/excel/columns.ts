/**
 * Column mappings for the bench workbook.
 *
 * The workbook format has shifted over time: the original "wide" export
 * (bench_sample_source.xlsx) carries Client/Project/Comments per row, while
 * the newer "lean" view (UpdatedView.xlsx) drops those columns and renames
 * the allocation metric. Rather than hard-coding one column name per field,
 * each logical field declares an ordered list of aliases. The parser uses
 * the first alias present in the header row.
 */

/** Columns we genuinely cannot proceed without (identity + snapshot date). */
export const REQUIRED_COLUMNS = [
  "Snapshot Date",
  "Resource Full Name",
  "Resource Enterprise ID",
] as const;

/**
 * Logical field → ordered list of possible column header names. The parser
 * tries each alias in order and falls back to `null` if none are present.
 */
export const FIELD_ALIASES = {
  // Identity
  eid: ["Resource Enterprise ID"],
  fullName: ["Resource Full Name"],
  email: ["Resource Email Address"],
  personnelNumber: ["Resource Personnel #"],

  // Org / classification
  managementLevel: ["Resource Management Level"],
  jobFamily: ["Resource Job Family"],
  jobFamilyGroup: ["Resource Job Family Group"],
  orgUnitL4: ["Resource Org Unit Level 4"],
  location: ["Resource Location"],
  country: ["Resource Country/Territory"],
  metroCity: ["Resource Metro City"],

  // Staffing status
  staffableStatus: ["Resource Staffable Status"],
  staffableDetailedStatus: ["Resource Staffable Detailed Status"],
  firstStaffableCategory: ["Resource First Staffable Date Category"],
  availableTimeFlag: ["Available Time Category Flag"],
  firstStaffableDate: ["Resource First Staffable Date"],

  // Allocation %: old workbook had a roll-up column; new "UpdatedView" only
  // exposes the per-calendar-entry allocation. Either is acceptable.
  allocationPct: [
    "Resource Total Current Booking Allocation %",
    "Curr Calendar % Allocation",
  ],

  // Current calendar entry (Client/Project/Comments are missing in the
  // lean format — the parser will record null for them).
  currentClient: ["Curr Calendar Client"],
  currentProject: ["Curr Calendar Project"],
  currentProjectStart: ["Curr Calendar Start Date"],
  currentProjectEnd: ["Curr Calendar End Date"],
  rollOffConfirmed: ["Curr Calendar Roll Off Confirmed"],
  currentComments: ["Curr Calendar Entry Comments"],

  // Skills, specializations, etc.
  skills: ["Resource Skills"],
  specializationsEarned: ["Resource Earned Specialization Paths"],
  specializationsBuilding: ["Resource Building Specialization Paths"],
  specializationsAspirational: ["Resource Aspirational Specialization Paths"],
  languages: ["Resource Languages"],
  certifications: ["Resource Certification"],

  workdayUrl: ["Resource Link to Resume"],
} as const;

export type FieldKey = keyof typeof FIELD_ALIASES;
