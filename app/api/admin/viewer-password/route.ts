import { NextResponse } from "next/server";
import { getAdminSession, hashPassword } from "@/lib/auth";
import { setViewerPasswordHash } from "@/lib/viewerAccess";

const MIN_LENGTH = 8;

export async function PUT(req: Request) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Admins only" }, { status: 403 });

  const { password } = await req.json().catch(() => ({}));
  if (typeof password !== "string" || password.length < MIN_LENGTH) {
    return NextResponse.json(
      { error: `Password must be at least ${MIN_LENGTH} characters.` },
      { status: 400 },
    );
  }

  const row = await setViewerPasswordHash(await hashPassword(password), admin.email);
  return NextResponse.json({ ok: true, updatedAt: row.updatedAt, updatedBy: row.updatedBy });
}

export async function DELETE() {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Admins only" }, { status: 403 });

  const row = await setViewerPasswordHash(null, admin.email);
  return NextResponse.json({ ok: true, updatedAt: row.updatedAt, updatedBy: row.updatedBy });
}
