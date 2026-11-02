import { jwtVerify } from "jose";

export const COOKIE_NAME = "bench-session";

export function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export type Session =
  | { role: "admin"; userId: string; email: string; name: string }
  | { role: "viewer"; name: string; viewerVersion: number };

export async function readToken(token: string): Promise<Session | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (payload.role === "viewer") {
      return { role: "viewer", name: "Viewer", viewerVersion: Number(payload.viewerVersion) };
    }
    // Every user account is an admin; viewers sign in with the shared password and have no account.
    if (typeof payload.userId !== "string") return null;
    return {
      role: "admin",
      userId: payload.userId,
      email: String(payload.email ?? ""),
      name: String(payload.name ?? ""),
    };
  } catch {
    return null;
  }
}
