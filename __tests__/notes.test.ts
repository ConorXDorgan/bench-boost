import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFile } from "node:fs/promises";
import path from "node:path";

const { findMany, create, updateMany, getAdminSession } = vi.hoisted(() => ({
  findMany: vi.fn(),
  create: vi.fn(),
  updateMany: vi.fn(),
  getAdminSession: vi.fn(),
}));
vi.mock("@/lib/db", () => ({ prisma: { resourceNote: { findMany, create, updateMany } } }));
vi.mock("@/lib/auth", () => ({ getAdminSession }));

import { GET, POST } from "@/app/api/notes/route";
import { DELETE } from "@/app/api/notes/[id]/route";
import { latestNotesByEid } from "@/lib/notes";

const admin = { role: "admin", userId: "u1", email: "a@x.com", name: "Alex" };
const note = { id: "n1", eid: "conor.dorgan", body: "To be extended", authorName: "Alex", createdAt: new Date("2026-10-01T10:00:00Z") };

const post = (body: unknown) =>
  new Request("http://x/api/notes", { method: "POST", body: JSON.stringify(body) });

beforeEach(() => {
  vi.clearAllMocks();
  getAdminSession.mockResolvedValue(admin);
});

describe("notes API", () => {
  it("is forbidden to non-admins", async () => {
    getAdminSession.mockResolvedValue(null);
    expect((await GET(new Request("http://x/api/notes?eid=a"))).status).toBe(403);
    expect((await POST(post({ eid: "a", body: "hi" }))).status).toBe(403);
    expect((await DELETE(new Request("http://x"), { params: Promise.resolve({ id: "n1" }) })).status).toBe(403);
    expect(create).not.toHaveBeenCalled();
  });

  it("lists live notes for an enterprise ID, newest first", async () => {
    findMany.mockResolvedValue([note]);
    const res = await GET(new Request("http://x/api/notes?eid=conor.dorgan"));
    expect(await res.json()).toEqual({ notes: [{ ...note, createdAt: "2026-10-01T10:00:00.000Z" }] });
    expect(findMany.mock.calls[0][0]).toMatchObject({
      where: { eid: "conor.dorgan", deletedAt: null },
      orderBy: { createdAt: "desc" },
    });
  });

  it("records the signed-in admin as author", async () => {
    create.mockResolvedValue(note);
    const res = await POST(post({ eid: "conor.dorgan", body: "  To be extended  " }));
    expect(res.status).toBe(201);
    expect(create.mock.calls[0][0].data).toEqual({
      eid: "conor.dorgan",
      body: "To be extended",
      authorId: "u1",
      authorName: "Alex",
    });
  });

  it("rejects empty and oversized notes", async () => {
    expect((await POST(post({ eid: "a", body: "   " }))).status).toBe(400);
    expect((await POST(post({ eid: "a", body: "x".repeat(2001) }))).status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });

  it("soft-deletes and 404s for missing notes", async () => {
    updateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });
    const ctx = { params: Promise.resolve({ id: "n1" }) };
    expect((await DELETE(new Request("http://x"), ctx)).status).toBe(200);
    expect(updateMany.mock.calls[0][0].data.deletedAt).toBeInstanceOf(Date);
    expect((await DELETE(new Request("http://x"), { params: Promise.resolve({ id: "gone" }) })).status).toBe(404);
  });
});

describe("latestNotesByEid", () => {
  it("keys the newest live note by enterprise ID", async () => {
    findMany.mockResolvedValue([note]);
    expect(await latestNotesByEid()).toEqual({
      "conor.dorgan": { ...note, createdAt: "2026-10-01T10:00:00.000Z" },
    });
    expect(findMany.mock.calls[0][0]).toMatchObject({ distinct: ["eid"], where: { deletedAt: null } });
  });
});

describe("schema", () => {
  it("does not tie notes to a snapshot, so imports never delete them", async () => {
    const schema = await readFile(path.join(process.cwd(), "prisma/schema.prisma"), "utf-8");
    const model = schema.match(/model ResourceNote \{([\s\S]*?)\n\}/)![1];
    expect(model).not.toMatch(/@relation|snapshotId|resourceId/);
  });
});
