import { prisma } from "@/lib/db";

const ID = 1;
// The proxy is bundled separately from route handlers, so it can't see
// in-process invalidation; a short TTL bounds how long a revoked viewer lingers.
const TTL_MS = 30_000;

interface ViewerAccessState {
  enabled: boolean;
  version: number;
}

let cached: { at: number; state: ViewerAccessState } | null = null;

export async function getViewerAccessState(): Promise<ViewerAccessState> {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.state;
  const row = await prisma.viewerAccess.findUnique({ where: { id: ID } });
  const state = { enabled: !!row?.passwordHash, version: row?.version ?? 0 };
  cached = { at: Date.now(), state };
  return state;
}

export async function getViewerAccess() {
  return prisma.viewerAccess.findUnique({ where: { id: ID } });
}

export async function setViewerPasswordHash(passwordHash: string | null, updatedBy: string) {
  const row = await prisma.viewerAccess.upsert({
    where: { id: ID },
    create: { id: ID, passwordHash, version: 1, updatedBy },
    update: { passwordHash, version: { increment: 1 }, updatedBy },
  });
  cached = null;
  return row;
}
