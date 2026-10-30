"use client";

import { useDeferredValue, useMemo, useState } from "react";
import Avatar from "@/components/Avatar";
import MultiSelect from "@/components/MultiSelect";
import BucketCheckboxes from "@/components/BucketCheckboxes";
import BusinessUnitToggle, { useBusinessUnit } from "@/components/BusinessUnitToggle";
import ResourceDetailDialog from "@/components/ResourceDetailDialog";
import {
  BUCKET_DOT,
  BUCKET_LABEL,
  BUCKET_PILL,
  BUCKET_PILL_UNKNOWN,
  fmtDate,
  fmtText,
  parseManagementLevel,
  BUCKETS,
  type BucketFilter,
} from "@/lib/format";
import type { ResourceListDto, SnapshotDto } from "@/lib/resourceDto";
import {
  SKILL_LEVEL_RANK,
  parseSkillString,
  type SkillLevel,
} from "@/lib/skills";

type MatchMode = "all" | "any";
type MinLevel = "any" | SkillLevel;

interface Props {
  snapshot: SnapshotDto;
  isAdmin: boolean;
}

/* The minimum-proficiency floor uses the same rank ordering as SKILL_LEVEL_RANK.
   "Any" = 0 (include null-level skills too). */
const MIN_LEVEL_OPTIONS: Array<{ value: MinLevel; label: string; rank: number }> = [
  { value: "any", label: "Any proficiency", rank: 0 },
  { value: "Beginner", label: "Beginner or higher", rank: SKILL_LEVEL_RANK.Beginner },
  { value: "Intermediate", label: "Intermediate or higher", rank: SKILL_LEVEL_RANK.Intermediate },
  { value: "Advanced", label: "Advanced or higher", rank: SKILL_LEVEL_RANK.Advanced },
  { value: "Expert", label: "Expert or higher", rank: SKILL_LEVEL_RANK.Expert },
  { value: "Master", label: "Master only", rank: SKILL_LEVEL_RANK.Master },
];

/** Treat null proficiency as below Beginner — so it satisfies "Any" only. */
function meetsMinLevel(skillLevel: SkillLevel | null, minRank: number): boolean {
  if (minRank === 0) return true;
  if (!skillLevel) return false;
  return SKILL_LEVEL_RANK[skillLevel] >= minRank;
}

export default function SkillsSearch({ snapshot, isAdmin }: Props) {
  const { businessUnits, businessUnit, setBusinessUnit, resources } = useBusinessUnit(
    snapshot.resources,
  );
  const [skillQuery, setSkillQuery] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [minLevel, setMinLevel] = useState<MinLevel>("any");
  const [matchMode, setMatchMode] = useState<MatchMode>("all");
  const [bucketFilter, setBucketFilter] = useState<BucketFilter>([...BUCKETS]);
  const [employeeLevels, setEmployeeLevels] = useState<string[]>([]);
  const [selected, setSelected] = useState<ResourceListDto | null>(null);

  const deferredSkillQuery = useDeferredValue(skillQuery);
  const deferredSelectedSkills = useDeferredValue(selectedSkills);
  const deferredBucket = useDeferredValue(bucketFilter);

  const minRank = MIN_LEVEL_OPTIONS.find((o) => o.value === minLevel)?.rank ?? 0;

  /**
   * Distinct management-level strings present in the snapshot, sorted by the
   * leading level number ascending (most senior first). Unnumbered values
   * (e.g. "Accenture Leadership") sort above the numbered ones.
   */
  const employeeLevelOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of resources) {
      const raw = r.managementLevel?.trim();
      if (raw) set.add(raw);
    }
    return [...set].sort((a, b) => {
      const na = parseManagementLevel(a).num;
      const nb = parseManagementLevel(b).num;
      if (na != null && nb != null) return na - nb;
      if (na != null) return 1; // numbered values come after unnumbered ("Accenture Leadership")
      if (nb != null) return -1;
      return a.localeCompare(b);
    });
  }, [resources]);

  /**
   * Pre-compute, for each resource, the set of skill names they have at or
   * above the current minimum proficiency. Recomputes only when the snapshot
   * or the proficiency floor changes — not on every keystroke in the search.
   */
  const resourceSkillIndex = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const r of resources) {
      const set = new Set<string>();
      for (const s of parseSkillString(r.skills)) {
        if (!meetsMinLevel(s.level, minRank)) continue;
        set.add(s.name);
      }
      map.set(r.id, set);
    }
    return map;
  }, [resources, minRank]);

  /** Aggregate count per skill (post-min-level filter). */
  const skillCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const set of resourceSkillIndex.values()) {
      for (const name of set) {
        counts.set(name, (counts.get(name) ?? 0) + 1);
      }
    }
    return counts;
  }, [resourceSkillIndex]);

  /**
   * Skills shown in the catalog: filtered by the search box, then sorted by
   * count descending. When the search box is empty, cap at the top 60 to
   * keep the DOM light; when searching, show every match.
   */
  const skillCatalog = useMemo(() => {
    const q = deferredSkillQuery.trim().toLowerCase();
    const all = [...skillCounts.entries()]
      .filter(([name]) => (q ? name.toLowerCase().includes(q) : true))
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    return q ? all : all.slice(0, 60);
  }, [skillCounts, deferredSkillQuery]);

  const totalSkillCount = skillCounts.size;

  /** Resources that satisfy: bucket + employee level + every selected skill (AND) or any (OR). */
  const matchedResources = useMemo(() => {
    const levelSet = new Set(employeeLevels);
    return resources.filter((r) => {
      if (!deferredBucket.includes(r.bucket)) return false;
      if (levelSet.size > 0 && !levelSet.has(r.managementLevel ?? "")) return false;
      if (deferredSelectedSkills.length === 0) return false;
      const skills = resourceSkillIndex.get(r.id) ?? new Set<string>();
      if (matchMode === "all") {
        return deferredSelectedSkills.every((s) => skills.has(s));
      }
      return deferredSelectedSkills.some((s) => skills.has(s));
    });
  }, [
    resources,
    deferredBucket,
    employeeLevels,
    deferredSelectedSkills,
    matchMode,
    resourceSkillIndex,
  ]);

  const toggleSkill = (name: string) => {
    setSelectedSkills((prev) =>
      prev.includes(name) ? prev.filter((s) => s !== name) : [...prev, name],
    );
  };

  const clearAll = () => {
    setSelectedSkills([]);
    setSkillQuery("");
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10">
        {/* Hero */}
        <section className="mb-8">
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-neutral-500">
            Skills Search
          </p>
          <h1 className="acn-rule text-3xl font-semibold tracking-tight text-black sm:text-4xl">
            Find people by skill
          </h1>
          <p className="mt-3 max-w-xl text-sm text-neutral-700">
            Browse the {totalSkillCount.toLocaleString()} distinct skills tagged across the
            current snapshot, see how many people hold each, and combine skills to find
            the right candidates.
          </p>
          {businessUnits.length > 1 && (
            <div className="mt-5">
              <BusinessUnitToggle
                businessUnits={businessUnits}
                value={businessUnit}
                onChange={setBusinessUnit}
              />
            </div>
          )}
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          {/* ---------- LEFT: skill catalog ---------- */}
          <SkillCatalog
            className="lg:col-span-2"
            query={skillQuery}
            onQueryChange={setSkillQuery}
            minLevel={minLevel}
            onMinLevelChange={setMinLevel}
            entries={skillCatalog}
            totalSkillCount={totalSkillCount}
            selected={selectedSkills}
            onToggle={toggleSkill}
          />

          {/* ---------- RIGHT: matched people ---------- */}
          <PeopleResults
            className="lg:col-span-3"
            selectedSkills={selectedSkills}
            onRemoveSkill={(name) => toggleSkill(name)}
            onClearAll={clearAll}
            matchMode={matchMode}
            onMatchModeChange={setMatchMode}
            bucketFilter={bucketFilter}
            onBucketChange={setBucketFilter}
            employeeLevels={employeeLevels}
            employeeLevelOptions={employeeLevelOptions}
            onEmployeeLevelsChange={setEmployeeLevels}
            matchedResources={matchedResources}
            totalResourceCount={resources.length}
            onSelectResource={setSelected}
          />
        </div>
      </main>

      <ResourceDetailDialog
        resource={selected}
        onClose={() => setSelected(null)}
        showNotes={isAdmin}
      />
    </div>
  );
}

/* -------------------- Skill catalog (left panel) -------------------- */

function SkillCatalog({
  className,
  query,
  onQueryChange,
  minLevel,
  onMinLevelChange,
  entries,
  totalSkillCount,
  selected,
  onToggle,
}: {
  className?: string;
  query: string;
  onQueryChange: (v: string) => void;
  minLevel: MinLevel;
  onMinLevelChange: (v: MinLevel) => void;
  entries: Array<[string, number]>;
  totalSkillCount: number;
  selected: string[];
  onToggle: (name: string) => void;
}) {
  return (
    <aside
      className={`rounded-xl border border-neutral-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)] ${
        className ?? ""
      }`}
    >
      <div className="space-y-3 border-b border-neutral-100 p-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-neutral-900">
            All skills
          </h2>
          <p className="mt-0.5 text-xs text-neutral-500">
            {entries.length === totalSkillCount
              ? `${totalSkillCount.toLocaleString()} skills`
              : `Showing ${entries.length.toLocaleString()} of ${totalSkillCount.toLocaleString()}`}
            {query.trim() ? ` matching "${query.trim()}"` : ""}
          </p>
        </div>

        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search skills…"
            className="w-full rounded-full border border-neutral-200 bg-white py-2 pl-9 pr-3 text-sm text-black shadow-sm placeholder:text-neutral-400 focus:border-[color:var(--acn-purple)]"
          />
        </div>

        <div className="flex items-center gap-2">
          <label
            htmlFor="min-level"
            className="text-[11px] font-medium uppercase tracking-wider text-neutral-500"
          >
            Min level
          </label>
          <div className="relative flex-1">
            <select
              id="min-level"
              value={minLevel}
              onChange={(e) => onMinLevelChange(e.target.value as MinLevel)}
              className="w-full appearance-none rounded-full border border-neutral-200 bg-white py-1.5 pl-3 pr-8 text-xs text-black shadow-sm hover:border-black/40"
            >
              {MIN_LEVEL_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400">
              ▾
            </span>
          </div>
        </div>
      </div>

      <ul className="max-h-[60vh] divide-y divide-neutral-100 overflow-y-auto">
        {entries.length === 0 ? (
          <li className="px-4 py-6 text-center text-xs text-neutral-500">
            {query.trim()
              ? "No skills match that search."
              : "No skills aggregated from the snapshot."}
          </li>
        ) : (
          entries.map(([name, count]) => {
            const active = selected.includes(name);
            return (
              <li key={name}>
                <button
                  type="button"
                  onClick={() => onToggle(name)}
                  aria-pressed={active}
                  className={`group flex w-full items-center gap-3 px-4 py-2 text-left transition ${
                    active
                      ? "bg-[color:var(--acn-purple-50)]"
                      : "hover:bg-neutral-50"
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold transition ${
                      active
                        ? "bg-[color:var(--acn-purple)] text-white"
                        : "border border-neutral-300 text-neutral-400 group-hover:border-[color:var(--acn-purple)] group-hover:text-[color:var(--acn-purple)]"
                    }`}
                    aria-hidden="true"
                  >
                    {active ? "✓" : "+"}
                  </span>
                  <span className="flex-1 truncate text-sm text-black" title={name}>
                    {name}
                  </span>
                  <span className="shrink-0 rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium tabular-nums text-neutral-700">
                    {count}
                  </span>
                </button>
              </li>
            );
          })
        )}
      </ul>
    </aside>
  );
}

/* -------------------- People results (right panel) -------------------- */

function PeopleResults({
  className,
  selectedSkills,
  onRemoveSkill,
  onClearAll,
  matchMode,
  onMatchModeChange,
  bucketFilter,
  onBucketChange,
  employeeLevels,
  employeeLevelOptions,
  onEmployeeLevelsChange,
  matchedResources,
  totalResourceCount,
  onSelectResource,
}: {
  className?: string;
  selectedSkills: string[];
  onRemoveSkill: (name: string) => void;
  onClearAll: () => void;
  matchMode: MatchMode;
  onMatchModeChange: (m: MatchMode) => void;
  bucketFilter: BucketFilter;
  onBucketChange: (b: BucketFilter) => void;
  employeeLevels: string[];
  employeeLevelOptions: string[];
  onEmployeeLevelsChange: (next: string[]) => void;
  matchedResources: ResourceListDto[];
  totalResourceCount: number;
  onSelectResource: (r: ResourceListDto) => void;
}) {
  return (
    <section className={className ?? ""}>
      {/* Selected-skills bar */}
      <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        {selectedSkills.length === 0 ? (
          <p className="py-2 text-center text-sm text-neutral-500">
            Pick one or more skills from the left to see matching people.
          </p>
        ) : (
          <>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-900">
                Selected skills ({selectedSkills.length})
              </h2>
              <button
                type="button"
                onClick={onClearAll}
                className="text-xs font-medium text-[color:var(--acn-purple)] hover:underline"
              >
                Clear all
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {selectedSkills.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => onRemoveSkill(name)}
                  className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-[color:var(--acn-purple)] px-3 py-1 text-xs font-medium text-white shadow-sm transition hover:bg-[color:var(--acn-purple-700)]"
                  title={`Remove ${name}`}
                >
                  <span className="truncate">{name}</span>
                  <span aria-hidden="true">×</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Filter row */}
      <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-neutral-200 bg-white p-3 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">
          Match
        </span>
        <div
          className="inline-flex overflow-hidden rounded-full border border-neutral-200 bg-neutral-50 text-xs font-medium"
          role="radiogroup"
          aria-label="Match mode"
        >
          {(["all", "any"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={matchMode === m}
              onClick={() => onMatchModeChange(m)}
              className={`px-3 py-1.5 transition ${
                matchMode === m
                  ? "bg-[color:var(--acn-purple)] text-white"
                  : "text-neutral-700 hover:text-black"
              }`}
            >
              {m === "all" ? "Has all" : "Has any"}
            </button>
          ))}
        </div>
        <span className="mx-1 h-4 w-px bg-neutral-200" />
        <BucketCheckboxes selected={bucketFilter} onChange={onBucketChange} size="sm" />
        <MultiSelect
          label="Level"
          size="sm"
          options={employeeLevelOptions}
          selected={employeeLevels}
          onChange={onEmployeeLevelsChange}
        />
        <span className="ml-auto text-xs text-neutral-500">
          {selectedSkills.length === 0 ? (
            <>Pick a skill to begin</>
          ) : (
            <>
              <span className="font-semibold text-black">
                {matchedResources.length.toLocaleString()}
              </span>{" "}
              of {totalResourceCount.toLocaleString()} match
            </>
          )}
        </span>
      </div>

      {/* Results table */}
      <div className="mt-3 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        {selectedSkills.length === 0 ? (
          <EmptyState
            title="No skills selected"
            hint="Choose at least one skill from the catalog to see people matches."
          />
        ) : matchedResources.length === 0 ? (
          <EmptyState
            title="No matches"
            hint={
              matchMode === "all"
                ? "Nobody has every selected skill at the chosen proficiency floor. Try switching to 'Has any' or lowering the minimum level."
                : "Nobody has any of the selected skills at the chosen proficiency floor."
            }
          />
        ) : (
          <ResultTable
            resources={matchedResources}
            onSelectResource={onSelectResource}
          />
        )}
      </div>
    </section>
  );
}

function ResultTable({
  resources,
  onSelectResource,
}: {
  resources: ResourceListDto[];
  onSelectResource: (r: ResourceListDto) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-neutral-100 text-left text-neutral-500">
          <tr className="border-b border-neutral-200">
            <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider">
              Name
            </th>
            <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider">
              Level
            </th>
            <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider">
              Job Family
            </th>
            <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider">
              Status
            </th>
            <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider">
              First Staffable
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {resources.map((r) => {
            const pillCls = r.unknown ? BUCKET_PILL_UNKNOWN : BUCKET_PILL[r.bucket];
            return (
              <tr
                key={r.id}
                onClick={() => onSelectResource(r)}
                className="cursor-pointer transition-colors duration-200 ease-out hover:bg-[color:var(--acn-purple-50)]/50"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={r.fullName} />
                    <span className="font-medium text-black">{r.fullName}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-neutral-700">
                  {fmtText(r.managementLevel)}
                </td>
                <td className="px-4 py-3 text-neutral-700">
                  {fmtText(r.jobFamily)}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs ring-1 ring-inset ${pillCls}`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${BUCKET_DOT[r.bucket]}`} />
                    {BUCKET_LABEL[r.bucket]}
                  </span>
                </td>
                <td className="px-4 py-3 text-neutral-700">
                  {fmtDate(r.firstStaffableDate)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function EmptyState({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-12 text-center text-neutral-500">
      <span
        aria-hidden="true"
        className="flex h-10 w-10 items-center justify-center rounded-full bg-[color:var(--acn-purple-50)] text-[color:var(--acn-purple)]"
      >
        ›
      </span>
      <p className="text-sm font-medium text-black">{title}</p>
      <p className="max-w-sm text-xs">{hint}</p>
    </div>
  );
}

