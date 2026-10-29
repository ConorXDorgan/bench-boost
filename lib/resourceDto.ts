export interface ResourceListDto {
  id: string;
  eid: string;
  fullName: string;
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
  currentProject: string | null;
  currentProjectEnd: string | null;
  skills: string | null;
}

export interface ResourceDetailDto {
  id: string;
  email: string | null;
  currentClient: string | null;
  currentProjectStart: string | null;
  rollOffConfirmed: string | null;
  currentComments: string | null;
  specializationsEarned: string | null;
  specializationsBuilding: string | null;
  specializationsAspirational: string | null;
  languages: string | null;
  certifications: string | null;
  workdayUrl: string | null;
}

export interface SnapshotDto {
  snapshotDate: string;
  ingestedAt: string;
  resources: ResourceListDto[];
}
