import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { addNote, listNotes } from "@/lib/notes";
import { MAX_NOTE_CHARS } from "@/lib/resourceDto";

const forbidden = () => NextResponse.json({ error: "Admins only" }, { status: 403 });

export async function GET(req: Request) {
  if (!(await getAdminSession())) return forbidden();
  const eid = new URL(req.url).searchParams.get("eid")?.trim();
  if (!eid) return NextResponse.json({ error: "Missing eid" }, { status: 400 });
  return NextResponse.json({ notes: await listNotes(eid) });
}

export async function POST(req: Request) {
  const admin = await getAdminSession();
  if (!admin) return forbidden();

  const { eid, body } = await req.json().catch(() => ({}));
  const text = typeof body === "string" ? body.trim() : "";
  if (typeof eid !== "string" || !eid.trim()) {
    return NextResponse.json({ error: "Missing eid" }, { status: 400 });
  }
  if (!text) return NextResponse.json({ error: "Note is empty." }, { status: 400 });
  if (text.length > MAX_NOTE_CHARS) {
    return NextResponse.json(
      { error: `Note is too long (max ${MAX_NOTE_CHARS} characters).` },
      { status: 400 },
    );
  }

  const note = await addNote(eid.trim(), text, { userId: admin.userId, name: admin.name || admin.email });
  return NextResponse.json({ note }, { status: 201 });
}
