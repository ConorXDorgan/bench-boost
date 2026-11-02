import { prisma } from "@/lib/db";
import type { NoteDto } from "@/lib/resourceDto";

const select = { id: true, eid: true, body: true, authorName: true, createdAt: true } as const;

function toDto(n: { id: string; eid: string; body: string; authorName: string; createdAt: Date }): NoteDto {
  return { ...n, createdAt: n.createdAt.toISOString() };
}

export async function listNotes(eid: string): Promise<NoteDto[]> {
  const rows = await prisma.resourceNote.findMany({
    where: { eid, deletedAt: null },
    orderBy: { createdAt: "desc" },
    select,
  });
  return rows.map(toDto);
}

export async function latestNotesByEid(): Promise<Record<string, NoteDto>> {
  const rows = await prisma.resourceNote.findMany({
    where: { deletedAt: null },
    orderBy: [{ eid: "asc" }, { createdAt: "desc" }],
    distinct: ["eid"],
    select,
  });
  return Object.fromEntries(rows.map((n) => [n.eid, toDto(n)]));
}

export async function addNote(
  eid: string,
  body: string,
  author: { userId: string; name: string },
): Promise<NoteDto> {
  const row = await prisma.resourceNote.create({
    data: { eid, body, authorId: author.userId, authorName: author.name },
    select,
  });
  return toDto(row);
}

export async function deleteNote(id: string): Promise<boolean> {
  const { count } = await prisma.resourceNote.updateMany({
    where: { id, deletedAt: null },
    data: { deletedAt: new Date() },
  });
  return count > 0;
}
