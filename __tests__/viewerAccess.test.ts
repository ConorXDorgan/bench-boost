import { beforeEach, describe, expect, it, vi } from "vitest";
import { SignJWT } from "jose";
import { NextRequest } from "next/server";

process.env.AUTH_SECRET = "test-secret";

const { getViewerAccess, getViewerAccessState, setViewerPasswordHash, cookieGet } = vi.hoisted(
  () => ({
    getViewerAccess: vi.fn(),
    getViewerAccessState: vi.fn(),
    setViewerPasswordHash: vi.fn(),
    cookieGet: vi.fn(),
  }),
);
vi.mock("@/lib/viewerAccess", () => ({
  getViewerAccess,
  getViewerAccessState,
  setViewerPasswordHash,
}));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: cookieGet }) }));

import { hashPassword } from "@/lib/auth";
import { readToken } from "@/lib/authToken";
import { POST as viewerLogin } from "@/app/api/auth/viewer/route";
import { PUT as setPassword } from "@/app/api/admin/viewer-password/route";
import { POST as upload } from "@/app/api/upload/route";
import { proxy } from "@/proxy";

const secret = new TextEncoder().encode("test-secret");
const sign = (payload: Record<string, unknown>) =>
  new SignJWT(payload).setProtectedHeader({ alg: "HS256" }).sign(secret);

const adminToken = () => sign({ userId: "u1", email: "a@x.com", name: "A" });
const viewerToken = (v = 3) => sign({ role: "viewer", viewerVersion: v });

function asCookie(token: string | undefined) {
  cookieGet.mockReturnValue(token ? { value: token } : undefined);
}

function proxyReq(path: string, token?: string) {
  return new NextRequest(`http://x${path}`, {
    headers: token ? { cookie: `bench-session=${token}` } : {},
  });
}

const post = (url: string, body: unknown) =>
  new Request(url, { method: "POST", body: JSON.stringify(body) });

beforeEach(() => {
  vi.clearAllMocks();
  getViewerAccessState.mockResolvedValue({ enabled: true, version: 3 });
});

describe("POST /api/auth/viewer", () => {
  it("refuses when viewer access is disabled", async () => {
    getViewerAccess.mockResolvedValue({ passwordHash: null, version: 2 });
    const res = await viewerLogin(post("http://x/api/auth/viewer", { password: "whatever" }));
    expect(res.status).toBe(403);
  });

  it("rejects a wrong password", async () => {
    getViewerAccess.mockResolvedValue({ passwordHash: await hashPassword("correct-pw"), version: 3 });
    const res = await viewerLogin(post("http://x/api/auth/viewer", { password: "nope" }));
    expect(res.status).toBe(401);
  });

  it("issues a viewer session carrying the current version", async () => {
    getViewerAccess.mockResolvedValue({ passwordHash: await hashPassword("correct-pw"), version: 3 });
    const res = await viewerLogin(post("http://x/api/auth/viewer", { password: "correct-pw" }));
    expect(res.status).toBe(200);
    const token = res.headers.get("set-cookie")!.match(/bench-session=([^;]+)/)![1];
    expect(await readToken(token)).toEqual({ role: "viewer", name: "Viewer", viewerVersion: 3 });
  });
});

describe("PUT /api/admin/viewer-password", () => {
  const put = (body: unknown) =>
    new Request("http://x/api/admin/viewer-password", { method: "PUT", body: JSON.stringify(body) });

  it("is forbidden to viewers", async () => {
    asCookie(await viewerToken());
    expect((await setPassword(put({ password: "long-enough" }))).status).toBe(403);
    expect(setViewerPasswordHash).not.toHaveBeenCalled();
  });

  it("rejects short passwords", async () => {
    asCookie(await adminToken());
    expect((await setPassword(put({ password: "short" }))).status).toBe(400);
  });

  it("stores a hash, never the plain password", async () => {
    asCookie(await adminToken());
    setViewerPasswordHash.mockResolvedValue({ updatedAt: new Date(), updatedBy: "a@x.com" });
    expect((await setPassword(put({ password: "long-enough" }))).status).toBe(200);
    const [hash, by] = setViewerPasswordHash.mock.calls[0];
    expect(hash).not.toBe("long-enough");
    expect(hash).toMatch(/^\$2/);
    expect(by).toBe("a@x.com");
  });
});

describe("route handlers", () => {
  it("upload is forbidden to viewers", async () => {
    asCookie(await viewerToken());
    expect((await upload(new Request("http://x/api/upload", { method: "POST" }))).status).toBe(403);
  });
});

describe("proxy", () => {
  it("redirects signed-out users to login", async () => {
    const res = await proxy(proxyReq("/"));
    expect(res.headers.get("location")).toBe("http://x/auth/login");
  });

  it("lets viewers see the bench", async () => {
    const res = await proxy(proxyReq("/", await viewerToken()));
    expect(res.headers.get("location")).toBeNull();
    expect(res.status).toBe(200);
  });

  it.each(["/ai", "/admin", "/api/ai/staff", "/api/upload", "/api/admin/viewer-password", "/api/notes"])(
    "blocks viewers from %s",
    async (path) => {
      const res = await proxy(proxyReq(path, await viewerToken()));
      if (path.startsWith("/api/")) expect(res.status).toBe(403);
      else expect(res.headers.get("location")).toBe("http://x/");
    },
  );

  it("signs viewers out after the password changes", async () => {
    getViewerAccessState.mockResolvedValue({ enabled: true, version: 4 });
    const res = await proxy(proxyReq("/", await viewerToken(3)));
    expect(res.headers.get("location")).toBe("http://x/auth/login");
    expect(res.headers.get("set-cookie")).toMatch(/bench-session=;/);
  });

  it("signs viewers out when viewer access is disabled", async () => {
    getViewerAccessState.mockResolvedValue({ enabled: false, version: 3 });
    const res = await proxy(proxyReq("/", await viewerToken(3)));
    expect(res.headers.get("location")).toBe("http://x/auth/login");
  });

  it("lets admins through to admin pages without a viewer lookup", async () => {
    const res = await proxy(proxyReq("/admin", await adminToken()));
    expect(res.headers.get("location")).toBeNull();
    expect(getViewerAccessState).not.toHaveBeenCalled();
  });
});
