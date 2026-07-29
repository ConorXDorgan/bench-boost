export interface ResourceDto {
  id: string;
  eid: string;
  fullName: string;
  email: string | null;
  managementLevel: string | null;
  jobFamily: string | null;
  jobFamilyGroup: string | null;
  orgUnitL4: string | null;
  location: string | null;
  country: string | null;
  metroCity: string | null;
  bucket: "available" | "coming" | "not_available";
  unknown: boolean;
  firstStaffableDate: string | null;
  weeksOut: number | null;
  allocationPct: number | null;
  staffableStatus: string | null;
  firstStaffableCategory: string | null;
  currentClient: string | null;
  currentProject: string | null;
  currentProjectStart: string | null;
  currentProjectEnd: string | null;
  rollOffConfirmed: string | null;
  currentComments: string | null;
  skills: string | null;
  specializationsEarned: string | null;
  specializationsBuilding: string | null;
  specializationsAspirational: string | null;
  languages: string | null;
  certifications: string | null;
  workdayUrl: string | null;
  cvUrl: string | null;
}

export interface SnapshotDto {
  id: string;
  snapshotDate: string;
  ingestedAt: string;
  resources: ResourceDto[];
}
