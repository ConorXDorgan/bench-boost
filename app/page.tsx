import Dashboard from "@/components/Dashboard";
import { loadLatestSnapshot } from "@/lib/snapshotLoader";

export default async function Page() {
  const snapshot = await loadLatestSnapshot();

  if (!snapshot) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <main className="mx-auto max-w-3xl px-6 py-16">
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-neutral-500">
            Getting started
          </p>
          <h1 className="acn-rule text-3xl font-semibold tracking-tight text-black">
            No snapshot loaded yet
          </h1>
          <p className="mt-4 max-w-prose text-sm text-neutral-700">
            Run{" "}
            <code className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-xs text-black">
              npm run seed
            </code>{" "}
            to load the sample workbook, or upload a workbook from the dashboard once
            it&apos;s available. Reload this page when you&apos;re done.
          </p>
        </main>
      </div>
    );
  }

  return <Dashboard snapshot={snapshot} />;
}
