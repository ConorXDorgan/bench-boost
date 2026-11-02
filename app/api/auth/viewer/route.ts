import { NextResponse } from "next/server";
import { verifyPassword, signToken, sessionCookie } from "@/lib/auth";
import { COOKIE_NAME } from "@/lib/authToken";
import { getViewerAccess } from "@/lib/viewerAccess";

export async function POST(req: Request) {
  const { password } = await req.json().catch(() => ({}));

  const access = await getViewerAccess();
  if (!access?.passwordHash) {
    return NextResponse.json({ error: "Viewer access is not enabled." }, { status: 403 });
  }
  if (typeof password !== "string" || !(await verifyPassword(password, access.passwordHash))) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  const token = await signToken({ role: "viewer", name: "Viewer", viewerVersion: access.version });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, token, sessionCookie);
  return res;
}
