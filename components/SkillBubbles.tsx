"use client";

import {
  NEUTRAL_PILL,
  SKILL_LEVELS,
  SKILL_LEVEL_PILL,
  parseSkillString,
  sortSkillsByLevel,
  type SkillLevel,
} from "@/lib/skills";

export function SkillLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-neutral-500">
      <span className="font-medium uppercase tracking-wider text-neutral-900">
        Skill level
      </span>
      {SKILL_LEVELS.map((lvl) => (
        <span key={lvl} className="inline-flex items-center gap-1.5">
          <span className={`inline-block h-2 w-2 rounded-full ${dotForLevel(lvl)}`} />
          {lvl}
        </span>
      ))}
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-block h-2 w-2 rounded-full bg-[color:var(--acn-line)]" />
        Unspecified
      </span>
    </div>
  );
}

function dotForLevel(lvl: SkillLevel): string {
  switch (lvl) {
    case "Master":
      return "bg-[color:var(--acn-purple)]";
    case "Expert":
      return "bg-[color:var(--acn-success)]";
    case "Advanced":
      return "bg-sky-500";
    case "Intermediate":
      return "bg-[color:var(--acn-warn)]";
    case "Beginner":
      return "bg-[color:var(--acn-neutral)]";
  }
}

interface SkillBubblesProps {
  raw: string | null | undefined;
  emptyMessage?: string;
  showLevelInLabel?: boolean;
}

export function SkillBubbles({
  raw,
  emptyMessage = "—",
  showLevelInLabel = false,
}: SkillBubblesProps) {
  const skills = sortSkillsByLevel(parseSkillString(raw));
  if (skills.length === 0) {
    return <span className="text-neutral-400">{emptyMessage}</span>;
  }
  return (
    <ul className="flex flex-wrap gap-1.5">
      {skills.map((s, i) => {
        const cls = s.level ? SKILL_LEVEL_PILL[s.level] : NEUTRAL_PILL;
        return (
          <li
            key={`${s.name}-${i}`}
            title={s.level ? `${s.name} — ${s.level}` : s.name}
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs ring-1 ring-inset ${cls}`}
          >
            <span className="truncate max-w-[18rem]">{s.name}</span>
            {showLevelInLabel && s.level && (
              <span className="ml-1 text-[10px] uppercase tracking-wide opacity-70">
                {s.level}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
