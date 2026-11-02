import SkillsSearch from "@/components/SkillsSearch";
import { getAdminSession } from "@/lib/auth";
import { loadLatestSnapshot } from "@/lib/snapshotLoader";

export default async function SkillsPage() {
  const [snapshot, admin] = await Promise.all([loadLatestSnapshot(), getAdminSession()]);

  if (!snapshot) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <main className="mx-auto max-w-3xl px-6 py-16">
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-neutral-500">
            Skills Search
          </p>
          <h1 className="acn-rule text-3xl font-semibold tracking-tight text-black">
            No snapshot loaded yet
          </h1>
          <p className="mt-4 max-w-prose text-sm text-neutral-700">
            Load a bench snapshot from the Bench page first; skills are aggregated from
            the resources in the latest snapshot.
          </p>
        </main>
      </div>
    );
  }

  return <SkillsSearch snapshot={snapshot} isAdmin={!!admin} />;
}
