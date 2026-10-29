import { beforeEach, describe, expect, it, vi } from "vitest";

const { findFirst, findUniqueOrThrow } = vi.hoisted(() => ({
  findFirst: vi.fn(),
  findUniqueOrThrow: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: { snapshot: { findFirst, findUniqueOrThrow } },
}));

import {
  loadFullSnapshot,
  loadLatestSnapshot,
  loadResourceDetail,
  resetSnapshotCache,
} from "@/lib/snapshotLoader";

function row(id: string) {
  return {
    id,
    eid: `E-${id}`,
    fullName: `Person ${id}`,
    email: `${id}@example.com`,
    managementLevel: "8-Manager",
    jobFamily: "Eng",
    jobFamilyGroup: "Tech",
    orgUnitL4: "Cloud",
    location: "Dublin",
    country: "IE",
    metroCity: "Dublin",
    bucket: "available",
    unknown: false,
    firstStaffableDate: new Date("2026-01-05T00:00:00Z"),
    weeksOut: 0,
    allocationPct: 0,
    staffableStatus: null,
    firstStaffableCategory: null,
    currentClient: "Acme",
    currentProject: "Proj",
    currentProjectStart: null,
    currentProjectEnd: null,
    rollOffConfirmed: "Yes",
    currentComments: "note",
    skills: "TypeScript (Expert)",
    specializationsEarned: "Earned",
    specializationsBuilding: null,
    specializationsAspirational: null,
    languages: "English",
    certifications: "AZ-900",
    workdayUrl: "https://wd.example/1",
  };
}

beforeEach(() => {
  resetSnapshotCache();
  findFirst.mockReset().mockResolvedValue({ id: "snap1" });
  findUniqueOrThrow.mockReset().mockResolvedValue({
    id: "snap1",
    snapshotDate: new Date("2026-01-05T00:00:00Z"),
    ingestedAt: new Date("2026-01-06T00:00:00Z"),
    resources: [row("a"), row("b")],
  });
});

describe("snapshotLoader", () => {
  it("omits rawJson and caches by snapshot id", async () => {
    await loadLatestSnapshot();
    await loadLatestSnapshot();
    await loadResourceDetail("a");
    expect(findUniqueOrThrow).toHaveBeenCalledTimes(1);
    expect(findUniqueOrThrow.mock.calls[0][0].include.resources.omit).toEqual({ rawJson: true });
  });

  it("reloads when a newer snapshot appears", async () => {
    await loadLatestSnapshot();
    findFirst.mockResolvedValue({ id: "snap2" });
    await loadLatestSnapshot();
    expect(findUniqueOrThrow).toHaveBeenCalledTimes(2);
  });

  it("list DTO excludes detail-only fields", async () => {
    const snap = await loadLatestSnapshot();
    expect(snap?.resources).toHaveLength(2);
    const r = snap!.resources[0] as unknown as Record<string, unknown>;
    for (const key of [
      "email",
      "currentClient",
      "currentProjectStart",
      "rollOffConfirmed",
      "currentComments",
      "specializationsEarned",
      "specializationsBuilding",
      "specializationsAspirational",
      "languages",
      "certifications",
      "workdayUrl",
      "cvUrl",
    ]) {
      expect(r).not.toHaveProperty(key);
    }
    expect(r.skills).toBe("TypeScript (Expert)");
  });

  it("serves detail by id and the full DTO for server-side consumers", async () => {
    const detail = await loadResourceDetail("b");
    expect(detail).toMatchObject({ id: "b", email: "b@example.com", currentClient: "Acme" });
    expect(await loadResourceDetail("nope")).toBeNull();
    const full = await loadFullSnapshot();
    expect(full?.resources[0]).toMatchObject({ eid: "E-a", certifications: "AZ-900" });
  });

  it("returns null when no snapshot exists", async () => {
    findFirst.mockResolvedValue(null);
    expect(await loadLatestSnapshot()).toBeNull();
  });
});
