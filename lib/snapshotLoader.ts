import { prisma } from "@/lib/db";
import type {
  ResourceDetailDto,
  ResourceListDto,
  SnapshotDto,
} from "@/lib/resourceDto";

function dateToIso(d: Date | null): string | null {
  return d ? d.toISOString() : null;
}

export type FullResourceDto = ResourceListDto & ResourceDetailDto;

interface CachedSnapshot {
  id: string;
  list: SnapshotDto;
  full: FullResourceDto[];
  detailById: Map<string, ResourceDetailDto>;
}

// Snapshots are immutable once ingested, so everything derived from a given
// id can be reused until a newer snapshot appears.
let cached: CachedSnapshot | null = null;

/** Test hook: drop the in-memory cache. */
export function resetSnapshotCache(): void {
  cached = null;
}

async function loadCache(): Promise<CachedSnapshot | null> {
  const latest = await prisma.snapshot.findFirst({
    orderBy: { snapshotDate: "desc" },
    select: { id: true },
  });
  if (!latest) return null;
  if (cached?.id === latest.id) return cached;

  const snapshot = await prisma.snapshot.findUniqueOrThrow({
    where: { id: latest.id },
    include: {
      resources: {
        orderBy: [{ bucket: "asc" }, { fullName: "asc" }],
        omit: { rawJson: true },
      },
    },
  });

  const detailById = new Map<string, ResourceDetailDto>();
  const full: FullResourceDto[] = [];
  const resources: ResourceListDto[] = [];

  for (const r of snapshot.resources) {
    const list: ResourceListDto = {
      id: r.id,
      eid: r.eid,
      fullName: r.fullName,
      managementLevel: r.managementLevel,
      jobFamily: r.jobFamily,
      jobFamilyGroup: r.jobFamilyGroup,
      orgUnitL4: r.orgUnitL4,
      location: r.location,
      country: r.country,
      metroCity: r.metroCity,
      bucket: r.bucket as ResourceListDto["bucket"],
      unknown: r.unknown,
      firstStaffableDate: dateToIso(r.firstStaffableDate),
      weeksOut: r.weeksOut,
      allocationPct: r.allocationPct,
      staffableStatus: r.staffableStatus,
      firstStaffableCategory: r.firstStaffableCategory,
      currentProject: r.currentProject,
      currentProjectEnd: dateToIso(r.currentProjectEnd),
      skills: r.skills,
    };
    const detail: ResourceDetailDto = {
      id: r.id,
      email: r.email,
      currentClient: r.currentClient,
      currentProjectStart: dateToIso(r.currentProjectStart),
      rollOffConfirmed: r.rollOffConfirmed,
      currentComments: r.currentComments,
      specializationsEarned: r.specializationsEarned,
      specializationsBuilding: r.specializationsBuilding,
      specializationsAspirational: r.specializationsAspirational,
      languages: r.languages,
      certifications: r.certifications,
      workdayUrl: r.workdayUrl,
    };
    resources.push(list);
    detailById.set(r.id, detail);
    full.push({ ...list, ...detail });
  }

  cached = {
    id: snapshot.id,
    list: {
      snapshotDate: snapshot.snapshotDate.toISOString(),
      ingestedAt: snapshot.ingestedAt.toISOString(),
      resources,
    },
    full,
    detailById,
  };
  return cached;
}

/** Latest snapshot as the slim list DTO sent to the client. `null` when none ingested. */
export async function loadLatestSnapshot(): Promise<SnapshotDto | null> {
  return (await loadCache())?.list ?? null;
}

/** Latest snapshot with every field, for server-only consumers (AI context). */
export async function loadFullSnapshot(): Promise<{
  snapshotDate: string;
  resources: FullResourceDto[];
} | null> {
  const c = await loadCache();
  return c ? { snapshotDate: c.list.snapshotDate, resources: c.full } : null;
}

export async function loadResourceDetail(id: string): Promise<ResourceDetailDto | null> {
  const c = await loadCache();
  return c?.detailById.get(id) ?? null;
}
