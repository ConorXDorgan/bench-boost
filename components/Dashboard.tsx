"use client";

import { useDeferredValue, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import type { ResourceListDto, SnapshotDto } from "@/lib/resourceDto";
import {
  BUCKET_DOT,
  BUCKET_LABEL,
  BUCKET_PILL,
  BUCKET_PILL_UNKNOWN,
  BUCKETS,
  LEVEL_PILL_BY_NUM,
  LEVEL_PILL_DEFAULT,
  type BucketFilter,
  fmtDate,
  fmtShortDate,
  fmtText,
  formatAvailableCategory,
  formatLevelTitle,
  formatStatus,
  parseManagementLevel,
  toggleBucket,
} from "@/lib/format";
import { parseSkillString, sortSkillsByLevel } from "@/lib/skills";
import UploadButton from "@/components/UploadButton";
import Avatar from "@/components/Avatar";
import MultiSelect from "@/components/MultiSelect";
import BucketCheckboxes from "@/components/BucketCheckboxes";
import ResourceDetailDialog from "@/components/ResourceDetailDialog";

const Charts = dynamic(() => import("@/components/Charts"), {
  ssr: false,
  loading: () => <ChartsSkeleton />,
});

function ChartsSkeleton() {
  return (
    <section
      aria-hidden="true"
      className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-2"
    >
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-[330px] animate-pulse rounded-xl border border-neutral-200 bg-white"
        />
      ))}
    </section>
  );
}

interface Props {
  snapshot: SnapshotDto;
  isAdmin: boolean;
}

export default function Dashboard({ snapshot, isAdmin }: Props) {
  const [bucketFilter, setBucketFilter] = useState<BucketFilter>([...BUCKETS]);
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [jobFamilyFilter, setJobFamilyFilter] = useState<string[]>([]);
  const [orgUnitFilter, setOrgUnitFilter] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ResourceListDto | null>(null);
  const [showCharts, setShowCharts] = useState(true);
  const [sorting, setSorting] = useState<SortingState>([
    { id: "bucket", desc: false },
    { id: "fullName", desc: false },
  ]);

  const deferredSearch = useDeferredValue(search);
  const deferredBucket = useDeferredValue(bucketFilter);
  const deferredLevel = useDeferredValue(levelFilter);

  const allCounts = useMemo(() => {
    return snapshot.resources.reduce(
      (acc, r) => {
        acc[r.bucket]++;
        return acc;
      },
      { available: 0, coming: 0, not_available: 0 } as Record<ResourceListDto["bucket"], number>,
    );
  }, [snapshot.resources]);

  const total = snapshot.resources.length;

  const jobFamilyOptions = useMemo(
    () => uniqueSorted(snapshot.resources.map((r) => r.jobFamily)),
    [snapshot.resources],
  );
  const orgUnitOptions = useMemo(
    () => uniqueSorted(snapshot.resources.map((r) => r.orgUnitL4)),
    [snapshot.resources],
  );

  /**
   * Set of resources that satisfy every filter EXCEPT the Career Level pill
   * row. This is what we count against when rendering the per-level pill
   * badges — selecting a level shouldn't zero out the other levels'
   * potential matches; it should reflect what each level would yield given
   * the other active filters (bucket, search, job family, org unit).
   */
  const filteredIgnoringLevel = useMemo(() => {
    const needle = deferredSearch.trim().toLowerCase();
    return snapshot.resources.filter((r) => {
      if (!deferredBucket.includes(r.bucket)) return false;
      if (jobFamilyFilter.length > 0 && !jobFamilyFilter.includes(r.jobFamily ?? "")) return false;
      if (orgUnitFilter.length > 0 && !orgUnitFilter.includes(r.orgUnitL4 ?? "")) return false;
      if (needle && !r.fullName.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [snapshot.resources, deferredBucket, jobFamilyFilter, orgUnitFilter, deferredSearch]);

  /**
   * Distinct management levels in the snapshot with their CURRENT counts
   * (after every filter except the Career Level pill row). The option list
   * itself is keyed off the full snapshot so the row of pills stays stable
   * when filters narrow the population to zero of a given level — the pill
   * stays visible, just shows 0.
   */
  const levelOptions = useMemo(() => {
    const order: Array<{ raw: string; num: number | null; title: string; displayTitle: string }> = [];
    const seen = new Set<string>();
    for (const r of snapshot.resources) {
      const raw = r.managementLevel?.trim();
      if (!raw || seen.has(raw)) continue;
      seen.add(raw);
      const { num, title } = parseManagementLevel(raw);
      order.push({ raw, num, title, displayTitle: formatLevelTitle(title) });
    }

    const counts = new Map<string, number>();
    for (const r of filteredIgnoringLevel) {
      const raw = r.managementLevel?.trim();
      if (!raw) continue;
      counts.set(raw, (counts.get(raw) ?? 0) + 1);
    }

    return order
      .map((o) => ({ ...o, count: counts.get(o.raw) ?? 0 }))
      .sort((a, b) => {
        if (a.num == null && b.num != null) return -1;
        if (a.num != null && b.num == null) return 1;
        if (a.num != null && b.num != null) return a.num - b.num;
        return a.displayTitle.localeCompare(b.displayTitle);
      });
  }, [snapshot.resources, filteredIgnoringLevel]);

  const filtered = useMemo(() => {
    if (deferredLevel === "all") return filteredIgnoringLevel;
    return filteredIgnoringLevel.filter((r) => r.managementLevel === deferredLevel);
  }, [filteredIgnoringLevel, deferredLevel]);

  const allBuckets = bucketFilter.length === BUCKETS.length;
  const activeFilterCount =
    (allBuckets ? 0 : 1) +
    (levelFilter !== "all" ? 1 : 0) +
    (jobFamilyFilter.length > 0 ? 1 : 0) +
    (orgUnitFilter.length > 0 ? 1 : 0) +
    (search.trim().length > 0 ? 1 : 0);

  const clearAllFilters = () => {
    setBucketFilter([...BUCKETS]);
    setLevelFilter("all");
    setJobFamilyFilter([]);
    setOrgUnitFilter([]);
    setSearch("");
  };

  const columns = useMemo<ColumnDef<ResourceListDto>[]>(
    () => [
      {
        accessorKey: "fullName",
        header: "Name",
        cell: ({ row }) => (
          <span className="font-semibold text-black">{row.original.fullName}</span>
        ),
      },
      {
        accessorKey: "managementLevel",
        header: "Level",
        cell: ({ row }) => <LevelPill raw={row.original.managementLevel} />,
        sortingFn: (a, b) => {
          const an = parseManagementLevel(a.original.managementLevel).num ?? 99;
          const bn = parseManagementLevel(b.original.managementLevel).num ?? 99;
          return an - bn;
        },
      },
      {
        accessorKey: "orgUnitL4",
        header: "Practice",
        cell: ({ row }) => (
          <span className="text-neutral-700">{fmtText(row.original.orgUnitL4)}</span>
        ),
      },
      {
        accessorKey: "jobFamily",
        header: "Job Family",
        cell: ({ row }) => (
          <span className="text-neutral-700">{fmtText(row.original.jobFamily)}</span>
        ),
      },
      {
        accessorKey: "location",
        header: "Location",
        cell: ({ row }) => (
          <span className="text-neutral-700">{fmtText(row.original.location)}</span>
        ),
      },
      {
        accessorKey: "bucket",
        header: "Status",
        cell: ({ row }) => {
          const r = row.original;
          const cls = r.unknown ? BUCKET_PILL_UNKNOWN : BUCKET_PILL[r.bucket];
          return (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs ring-1 ring-inset ${cls}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${BUCKET_DOT[r.bucket]}`} />
              {formatStatus({ staffableStatus: r.staffableStatus, bucket: r.bucket })}
            </span>
          );
        },
        sortingFn: (a, b) => {
          const order = { available: 0, coming: 1, not_available: 2 } as const;
          return order[a.original.bucket] - order[b.original.bucket];
        },
      },
      {
        id: "available",
        header: "Available",
        accessorFn: (r) => formatAvailableCategory(r.firstStaffableCategory),
        cell: ({ row }) => (
          <span className="text-neutral-700">
            {formatAvailableCategory(row.original.firstStaffableCategory)}
          </span>
        ),
        sortingFn: (a, b) => {
          const aw = a.original.weeksOut ?? Infinity;
          const bw = b.original.weeksOut ?? Infinity;
          return aw - bw;
        },
      },
      {
        accessorKey: "currentProjectEnd",
        header: "Available Date",
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-neutral-700">
            {fmtShortDate(row.original.currentProjectEnd)}
          </span>
        ),
        sortingFn: (a, b) => {
          const aDate = a.original.currentProjectEnd
            ? new Date(a.original.currentProjectEnd).getTime()
            : Infinity;
          const bDate = b.original.currentProjectEnd
            ? new Date(b.original.currentProjectEnd).getTime()
            : Infinity;
          return aDate - bDate;
        },
      },
      {
        id: "keySkills",
        header: "Key Skills",
        enableSorting: false,
        cell: ({ row }) => <KeySkillsCell raw={row.original.skills} />,
      },
    ],
    [],
  );

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="min-h-screen bg-neutral-50">
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10">
        {/* ---------- Page hero ---------- */}
        <section className="mb-8 flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-neutral-500">
              Resource Availability
            </p>
            <h1 className="acn-rule text-3xl font-semibold tracking-tight text-black sm:text-4xl">
              Who&apos;s on the bench
            </h1>
            <p className="mt-3 max-w-xl text-sm text-neutral-700">
              Live view of staffable people across the practice. Click any card to filter; click a
              row for the full profile.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <button
              onClick={() => downloadCsv(filtered, snapshot.snapshotDate)}
              className="inline-flex items-center gap-2 rounded-full border border-black/15 bg-white px-4 py-2 text-sm font-medium text-black shadow-sm transition hover:border-black hover:bg-black hover:text-white"
            >
              Export CSV
              <span aria-hidden="true">↓</span>
            </button>
            {isAdmin && <UploadButton />}
          </div>
        </section>

        {/* ---------- Stat cards ---------- */}
        <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {BUCKETS.map((b) => {
            const included = bucketFilter.includes(b);
            const active = !allBuckets && included;
            const count = allCounts[b];
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
            return (
              <button
                key={b}
                onClick={() => setBucketFilter(allBuckets ? [b] : toggleBucket(bucketFilter, b))}
                aria-pressed={active}
                className={`group relative overflow-hidden rounded-xl border bg-white p-5 text-left shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition ${
                  active
                    ? "border-black ring-2 ring-[color:var(--acn-purple)]/15"
                    : "border-neutral-200 hover:border-black/40 hover:shadow-[0_8px_24px_rgba(161,0,255,0.07)]"
                } ${allBuckets || included ? "" : "opacity-60"}`}
              >
                <span
                  className={`absolute left-0 top-0 h-full w-1 transition ${
                    active
                      ? "bg-[color:var(--acn-purple)]"
                      : "bg-transparent group-hover:bg-[color:var(--acn-purple)]/40"
                  }`}
                />
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-neutral-500">
                  <span className={`h-2 w-2 rounded-full ${BUCKET_DOT[b]}`} />
                  {BUCKET_LABEL[b]}
                </div>
                <div className="mt-3 flex items-baseline gap-3">
                  <span className="acn-fade-up text-4xl font-semibold tracking-tight tabular-nums text-black">
                    {count}
                  </span>
                  <span className="text-sm text-neutral-500">{pct}%</span>
                </div>
                <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-neutral-100">
                  <div
                    className={`h-full transition-all duration-500 ${
                      b === "available"
                        ? "bg-[color:var(--acn-success)]"
                        : b === "coming"
                          ? "bg-[color:var(--acn-warn)]"
                          : "bg-[color:var(--acn-neutral)]"
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-neutral-500 transition group-hover:text-[color:var(--acn-purple)]">
                  {allBuckets ? "Filter to this bucket" : included ? "Shown, click to hide" : "Hidden, click to show"}
                  <span aria-hidden="true">›</span>
                </p>
              </button>
            );
          })}
        </section>

        {/* ---------- Insights / charts ---------- */}
        <section className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-neutral-900">
            Insights
          </h2>
          <button
            type="button"
            onClick={() => setShowCharts((s) => !s)}
            className="inline-flex items-center gap-1 text-xs font-medium text-neutral-500 transition hover:text-black"
          >
            {showCharts ? "Hide charts" : "Show charts"}
            <span
              className={`text-[color:var(--acn-purple)] transition ${showCharts ? "rotate-90" : ""}`}
              aria-hidden="true"
            >
              ›
            </span>
          </button>
        </section>
        {showCharts && <Charts resources={snapshot.resources} />}

        {/* ---------- Career Level pill row ---------- */}
        <section className="mb-4">
          <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500">
            Career Level
          </h2>
          <div className="flex flex-wrap gap-2">
            <LevelFilterPill
              label="All Levels"
              count={filteredIgnoringLevel.length}
              active={levelFilter === "all"}
              onClick={() => setLevelFilter("all")}
            />
            {levelOptions.map((o) => (
              <LevelFilterPill
                key={o.raw}
                label={o.displayTitle}
                count={o.count}
                active={levelFilter === o.raw}
                onClick={() =>
                  setLevelFilter((current) => (current === o.raw ? "all" : o.raw))
                }
              />
            ))}
          </div>
        </section>

        {/* ---------- Filter bar ---------- */}
        <div className="mb-4 rounded-xl border border-neutral-200 bg-white p-3 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-72">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                  <path
                    d="m20 20-3.5-3.5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name…"
                className="w-full rounded-full border border-neutral-200 bg-white py-2 pl-9 pr-3 text-sm text-black shadow-sm placeholder:text-neutral-400 focus:border-[color:var(--acn-purple)]"
              />
            </div>
            <MultiSelect
              label="Job Family"
              options={jobFamilyOptions}
              selected={jobFamilyFilter}
              onChange={setJobFamilyFilter}
            />
            <MultiSelect
              label="Practice"
              options={orgUnitOptions}
              selected={orgUnitFilter}
              onChange={setOrgUnitFilter}
            />
            <BucketCheckboxes selected={bucketFilter} onChange={setBucketFilter} />
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="ml-auto inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium text-[color:var(--acn-purple)] hover:bg-[color:var(--acn-purple-50)]"
              >
                Clear filters
                <span aria-hidden="true">×</span>
              </button>
            )}
          </div>
        </div>

        {/* ---------- Desktop table ---------- */}
        <div className="hidden overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)] md:block">
          <div className="flex items-center justify-between gap-3 border-b border-neutral-100 bg-neutral-50/60 px-4 py-2.5 text-xs text-neutral-600">
            <span>
              Showing <span className="font-semibold text-black">{filtered.length}</span> of{" "}
              <span className="font-semibold text-black">{total}</span> resources
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-neutral-100 text-left text-neutral-500">
                {table.getHeaderGroups().map((hg) => (
                  <tr key={hg.id} className="border-b border-neutral-200">
                    {hg.headers.map((h) => {
                      const sort = h.column.getIsSorted();
                      return (
                        <th
                          key={h.id}
                          onClick={h.column.getToggleSortingHandler()}
                          className="cursor-pointer select-none px-4 py-3 text-[11px] font-semibold uppercase tracking-wider transition hover:text-black"
                        >
                          <span className="inline-flex items-center gap-1.5">
                            {flexRender(h.column.columnDef.header, h.getContext())}
                            <span
                              className={`text-[10px] transition ${
                                sort
                                  ? "text-[color:var(--acn-purple)]"
                                  : "text-neutral-300"
                              }`}
                            >
                              {sort === "asc" ? "▲" : sort === "desc" ? "▼" : "↕"}
                            </span>
                          </span>
                        </th>
                      );
                    })}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => setSelected(row.original)}
                    className="group cursor-pointer transition-colors duration-200 ease-out hover:bg-[color:var(--acn-purple-50)]/50"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3 text-neutral-700">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
                {table.getRowModel().rows.length === 0 && (
                  <tr>
                    <td colSpan={columns.length} className="px-4 py-16 text-center">
                      <EmptyState onClear={clearAllFilters} hasFilters={activeFilterCount > 0} />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ---------- Mobile cards ---------- */}
        <ul className="space-y-2 md:hidden">
          {filtered.map((r) => (
            <li
              key={r.id}
              onClick={() => setSelected(r)}
              className="cursor-pointer rounded-xl border border-neutral-200 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition hover:border-black/30"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5">
                  <Avatar name={r.fullName} />
                  <div>
                    <p className="font-medium text-black">{r.fullName}</p>
                    <p className="text-xs text-neutral-500">{fmtText(r.jobFamily)}</p>
                  </div>
                </div>
                <span
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs ring-1 ring-inset ${
                    r.unknown ? BUCKET_PILL_UNKNOWN : BUCKET_PILL[r.bucket]
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${BUCKET_DOT[r.bucket]}`} />
                  {BUCKET_LABEL[r.bucket]}
                </span>
              </div>
              <p className="mt-3 text-xs text-neutral-500">
                First staffable{" "}
                <span className="font-medium text-neutral-700">
                  {fmtDate(r.firstStaffableDate)}
                </span>
                <span className="mx-1.5">·</span>
                <span className="text-neutral-700">{fmtText(r.currentProject)}</span>
              </p>
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="rounded-xl border border-dashed border-neutral-200 p-8 text-center">
              <EmptyState onClear={clearAllFilters} hasFilters={activeFilterCount > 0} />
            </li>
          )}
        </ul>

        <footer className="mt-12 flex flex-wrap items-center justify-between gap-2 border-t border-neutral-200 pt-6 text-xs text-neutral-500">
          <p>
            Last ingested{" "}
            <span className="font-medium text-neutral-700">{fmtDate(snapshot.ingestedAt)}</span>
          </p>
          <p className="inline-flex items-center gap-1">
            Bench Tool
            <span className="text-[color:var(--acn-purple)]">›</span>
            Accenture
          </p>
        </footer>
      </main>

      <ResourceDetailDialog
        resource={selected}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}

/* ----------------------- subcomponents ----------------------- */

function uniqueSorted(values: (string | null)[]): string[] {
  const set = new Set<string>();
  for (const v of values) {
    if (v && v.trim()) set.add(v);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

/**
 * Pill button used in the "Career Level" filter row. Acts like a single-
 * select radio — clicking the same pill again deselects (returns to All).
 */
function LevelFilterPill({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium transition ${
        active
          ? "border-[color:var(--acn-purple)] bg-[color:var(--acn-purple)] text-white shadow-sm"
          : "border-neutral-200 bg-white text-black hover:border-black/40"
      }`}
    >
      {label}
      <span
        className={`inline-flex h-5 min-w-6 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold tabular-nums ${
          active ? "bg-white/25 text-white" : "bg-neutral-100 text-neutral-600"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

/**
 * Coloured pill for an Accenture management level — keyed by the numeric
 * level so the title text can vary (e.g. "Manager" vs "Manager II") while
 * the colour stays stable.
 */
function LevelPill({ raw }: { raw: string | null }) {
  if (!raw) return <span className="text-neutral-400">—</span>;
  const { num, title } = parseManagementLevel(raw);
  const colours = num != null ? LEVEL_PILL_BY_NUM[num] : undefined;
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
        colours ?? LEVEL_PILL_DEFAULT
      }`}
      title={raw}
    >
      {formatLevelTitle(title)}
    </span>
  );
}

/**
 * Compact top-N skills summary for the Key Skills column. Sorts by
 * proficiency so the Master/Expert/Advanced entries surface first, and
 * shows a small "+N more" indicator when truncated.
 */
function KeySkillsCell({ raw }: { raw: string | null }) {
  const skills = sortSkillsByLevel(parseSkillString(raw));
  if (skills.length === 0) {
    return <span className="text-neutral-400">—</span>;
  }
  const top = skills.slice(0, 3);
  const overflow = skills.length - top.length;
  return (
    <div className="flex flex-wrap gap-1">
      {top.map((s, i) => (
        <span
          key={`${s.name}-${i}`}
          className="inline-flex items-center rounded-md border border-neutral-200 bg-white px-2 py-0.5 text-[11px] text-neutral-700"
          title={s.level ? `${s.name} — ${s.level}` : s.name}
        >
          {s.name}
        </span>
      ))}
      {overflow > 0 && (
        <span
          className="inline-flex items-center rounded-md bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-500"
          title={`${overflow} more skill${overflow === 1 ? "" : "s"}`}
        >
          +{overflow}
        </span>
      )}
    </div>
  );
}

function EmptyState({ onClear, hasFilters }: { onClear: () => void; hasFilters: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2 text-neutral-500">
      <span
        aria-hidden="true"
        className="flex h-10 w-10 items-center justify-center rounded-full bg-[color:var(--acn-purple-50)] text-[color:var(--acn-purple)]"
      >
        ›
      </span>
      <p className="text-sm">No matching resources.</p>
      {hasFilters && (
        <button
          type="button"
          onClick={onClear}
          className="text-xs font-medium text-[color:var(--acn-purple)] hover:underline"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}

function downloadCsv(rows: ResourceListDto[], snapshotDate: string) {
  const cols: Array<{ key: keyof ResourceListDto; header: string }> = [
    { key: "fullName", header: "Name" },
    { key: "eid", header: "EID" },
    { key: "managementLevel", header: "Management Level" },
    { key: "jobFamily", header: "Job Family" },
    { key: "jobFamilyGroup", header: "Job Family Group" },
    { key: "orgUnitL4", header: "Practice" },
    { key: "location", header: "Location" },
    { key: "country", header: "Country" },
    { key: "metroCity", header: "Metro City" },
    { key: "bucket", header: "Bucket" },
    { key: "firstStaffableDate", header: "First Staffable Date" },
    { key: "weeksOut", header: "Weeks Out" },
    { key: "allocationPct", header: "Allocation %" },
    { key: "currentProject", header: "Current Project" },
    { key: "currentProjectEnd", header: "Available Date" },
    { key: "skills", header: "Skills" },
  ];
  const escape = (v: unknown) => {
    if (v == null) return "";
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [cols.map((c) => c.header).join(",")];
  for (const row of rows) {
    lines.push(cols.map((c) => escape(row[c.key])).join(","));
  }
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `bench_${snapshotDate.slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
