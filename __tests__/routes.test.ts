import { beforeEach, describe, expect, it, vi } from "vitest";

const { loadResourceDetail, findUnique } = vi.hoisted(() => ({
  loadResourceDetail: vi.fn(),
  findUnique: vi.fn(),
}));
vi.mock("@/lib/snapshotLoader", () => ({ loadResourceDetail }));

vi.mock("@/lib/db", () => ({ prisma: { user: { findUnique } } }));
vi.mock("@/lib/auth", () => ({
  verifyPassword: vi.fn().mockResolvedValue(true),
  signToken: vi.fn().mockResolvedValue("token"),
}));

import { GET } from "@/app/api/resources/[id]/route";
import { POST as login } from "@/app/api/auth/login/route";
import { NextRequest } from "next/server";

beforeEach(() => {
  loadResourceDetail.mockReset();
  findUnique.mockReset();
});

describe("GET /api/resources/[id]", () => {
  it("returns detail fields", async () => {
    loadResourceDetail.mockResolvedValue({ id: "a", email: "a@x.com", languages: "English" });
    const res = await GET(new Request("http://x/api/resources/a"), {
      params: Promise.resolve({ id: "a" }),
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ id: "a", email: "a@x.com", languages: "English" });
    expect(loadResourceDetail).toHaveBeenCalledWith("a");
  });

  it("404s for an unknown id", async () => {
    loadResourceDetail.mockResolvedValue(null);
    const res = await GET(new Request("http://x/api/resources/zzz"), {
      params: Promise.resolve({ id: "zzz" }),
    });
    expect(res.status).toBe(404);
  });
});

describe("POST /api/auth/login", () => {
  it("lowercases and trims the email", async () => {
    findUnique.mockResolvedValue({ id: "u1", email: "jane@x.com", name: "Jane", passwordHash: "h" });
    const req = new NextRequest("http://x/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "  Jane@X.com ", password: "pw" }),
    });
    const res = await login(req);
    expect(res.status).toBe(200);
    expect(findUnique).toHaveBeenCalledWith({ where: { email: "jane@x.com" } });
  });
});
