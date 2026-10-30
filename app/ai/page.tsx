import { redirect } from "next/navigation";
import AIAssistant from "@/components/AIAssistant";
import { getAdminSession } from "@/lib/auth";
import { loadLatestSnapshot } from "@/lib/snapshotLoader";

export default async function AIPage() {
  if (!(await getAdminSession())) redirect("/");
  const snapshot = await loadLatestSnapshot();
  const benchSize = snapshot
    ? snapshot.resources.filter((r) => r.bucket === "available" || r.bucket === "coming").length
    : 0;

  return (
    <AIAssistant
      snapshotDate={snapshot ? snapshot.snapshotDate.slice(0, 10) : null}
      benchSize={benchSize}
    />
  );
}
