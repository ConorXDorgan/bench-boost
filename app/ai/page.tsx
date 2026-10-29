import AIAssistant from "@/components/AIAssistant";
import { loadLatestSnapshot } from "@/lib/snapshotLoader";

export default async function AIPage() {
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
