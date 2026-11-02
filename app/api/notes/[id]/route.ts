import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { deleteNote } from "@/lib/notes";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }
  const { id } = await params;
  if (!(await deleteNote(id))) {
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
