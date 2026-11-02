import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword, signToken, sessionCookie } from "@/lib/auth";
import { COOKIE_NAME } from "@/lib/authToken";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  const user = await prisma.user.findUnique({ where: { email: String(email ?? "").trim().toLowerCase() } });
  if (!user) {
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }

  const token = await signToken({ role: "admin", userId: user.id, email: user.email, name: user.name });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, token, sessionCookie);
  return res;
}
