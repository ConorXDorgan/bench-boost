import { prisma } from "@/lib/db";
import AIAssistant from "@/components/AIAssistant";

export const dynamic = "force-dynamic";

export default async function AIPage() {
  const snapshot = await prisma.snapshot.findFirst({
    orderBy: { snapshotDate: "desc" },
    include: {
      resources: {
        where: { bucket: { in: ["available", "coming"] } },
        select: { id: true },
      },
    },
  });

  return (
    <AIAssistant
      snapshotDate={snapshot ? snapshot.snapshotDate.toISOString().slice(0, 10) : null}
      benchSize={snapshot?.resources.length ?? 0}
    />
  );
}
