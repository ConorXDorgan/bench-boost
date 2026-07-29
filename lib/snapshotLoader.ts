import { prisma } from "@/lib/db";
import type { ResourceDto, SnapshotDto } from "@/lib/resourceDto";

function dateToIso(d: Date | null): string | null {
  return d ? d.toISOString() : null;
}

/**
 * Load the most recent snapshot from the database and serialise it into
 * the DTO shape the client components expect. Returns `null` when no
 * snapshot has been ingested yet.
 */
export async function loadLatestSnapshot(): Promise<SnapshotDto | null> {
  const snapshot = await prisma.snapshot.findFirst({
    orderBy: { snapshotDate: "desc" },
    include: {
      resources: {
        orderBy: [{ bucket: "asc" }, { fullName: "asc" }],
      },
    },
  });
  if (!snapshot) return null;

  return {
    id: snapshot.id,
    snapshotDate: snapshot.snapshotDate.toISOString(),
    ingestedAt: snapshot.ingestedAt.toISOString(),
    resources: snapshot.resources.map<ResourceDto>((r) => ({
      id: r.id,
      eid: r.eid,
      fullName: r.fullName,
      email: r.email,
      managementLevel: r.managementLevel,
      jobFamily: r.jobFamily,
      jobFamilyGroup: r.jobFamilyGroup,
      orgUnitL4: r.orgUnitL4,
      location: r.location,
      country: r.country,
      metroCity: r.metroCity,
      bucket: r.bucket as ResourceDto["bucket"],
      unknown: r.unknown,
      firstStaffableDate: dateToIso(r.firstStaffableDate),
      weeksOut: r.weeksOut,
      allocationPct: r.allocationPct,
      staffableStatus: r.staffableStatus,
      firstStaffableCategory: r.firstStaffableCategory,
      currentClient: r.currentClient,
      currentProject: r.currentProject,
      currentProjectStart: dateToIso(r.currentProjectStart),
      currentProjectEnd: dateToIso(r.currentProjectEnd),
      rollOffConfirmed: r.rollOffConfirmed,
      currentComments: r.currentComments,
      skills: r.skills,
      specializationsEarned: r.specializationsEarned,
      specializationsBuilding: r.specializationsBuilding,
      specializationsAspirational: r.specializationsAspirational,
      languages: r.languages,
      certifications: r.certifications,
      workdayUrl: r.workdayUrl,
      cvUrl: r.cvUrl,
    })),
  };
}
