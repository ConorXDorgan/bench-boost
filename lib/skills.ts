export type SkillLevel = "Master" | "Expert" | "Advanced" | "Intermediate" | "Beginner";

export const SKILL_LEVELS: SkillLevel[] = [
  "Master",
  "Expert",
  "Advanced",
  "Intermediate",
  "Beginner",
];

export const SKILL_LEVEL_RANK: Record<SkillLevel, number> = {
  Master: 5,
  Expert: 4,
  Advanced: 3,
  Intermediate: 2,
  Beginner: 1,
};

// Accenture palette: brand purple anchors the top tier (Master), then a
// graduated set of complementary hues toward neutral.
export const SKILL_LEVEL_PILL: Record<SkillLevel, string> = {
  Master: "bg-[color:var(--acn-purple-50)] text-[color:var(--acn-purple-700)] ring-[color:var(--acn-purple)]/25",
  Expert: "bg-[color:var(--acn-success-50)] text-[#00766a] ring-[color:var(--acn-success)]/30",
  Advanced: "bg-[#e0f2fe] text-[#075985] ring-[#7dd3fc]/40",
  Intermediate: "bg-[color:var(--acn-warn-50)] text-[#8a5300] ring-[color:var(--acn-warn)]/30",
  Beginner: "bg-[color:var(--acn-neutral-50)] text-[#3f3f46] ring-[color:var(--acn-neutral)]/30",
};

export const SKILL_LEVEL_FILL: Record<SkillLevel, string> = {
  Master: "#a100ff",
  Expert: "#00b5a0",
  Advanced: "#0ea5e9",
  Intermediate: "#f39800",
  Beginner: "#8c8c95",
};

export const NEUTRAL_PILL =
  "bg-[color:var(--acn-bg-2)] text-neutral-700 ring-[color:var(--acn-line)]";

export interface ParsedSkill {
  name: string;
  level: SkillLevel | null;
}

const LEVEL_PATTERN = new RegExp(`\\s*\\((${SKILL_LEVELS.join("|")})\\)\\s*$`);
const SEQ_PATTERN = /^\s*\d+\s*[-.)]\s*/;

export function parseSkillString(raw: string | null | undefined): ParsedSkill[] {
  if (!raw) return [];
  return raw
    .split(/[|;]|(?:,(?=\s*\d+\s*[-.)]))/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((chunk) => {
      const stripped = chunk.replace(SEQ_PATTERN, "");
      const match = stripped.match(LEVEL_PATTERN);
      if (match) {
        return {
          name: stripped.slice(0, match.index).trim(),
          level: match[1] as SkillLevel,
        };
      }
      return { name: stripped, level: null };
    })
    .filter((s) => s.name.length > 0);
}

export function sortSkillsByLevel(skills: ParsedSkill[]): ParsedSkill[] {
  return [...skills].sort((a, b) => {
    const ar = a.level ? SKILL_LEVEL_RANK[a.level] : 0;
    const br = b.level ? SKILL_LEVEL_RANK[b.level] : 0;
    if (ar !== br) return br - ar;
    return a.name.localeCompare(b.name);
  });
}
