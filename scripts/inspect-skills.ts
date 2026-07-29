import { prisma } from "@/lib/db";

async function main() {
  const samples = await prisma.resource.findMany({
    where: { skills: { not: null } },
    select: { fullName: true, skills: true },
    take: 5,
  });
  console.log("--- Sample raw skill strings ---");
  for (const s of samples) {
    console.log(`\n${s.fullName}:`);
    console.log(s.skills);
  }

  console.log("\n--- All skill-level tokens found ---");
  const all = await prisma.resource.findMany({
    where: { skills: { not: null } },
    select: { skills: true },
  });
  const levels = new Map<string, number>();
  const splitterCounts: Record<string, number> = { ";": 0, ",": 0, "|": 0, "\n": 0 };
  for (const r of all) {
    if (!r.skills) continue;
    for (const sep of Object.keys(splitterCounts)) {
      if (r.skills.includes(sep)) splitterCounts[sep]++;
    }
    const matches = r.skills.matchAll(/\(([^)]+)\)/g);
    for (const m of matches) {
      const tok = m[1].trim();
      levels.set(tok, (levels.get(tok) ?? 0) + 1);
    }
  }
  console.log("Separator usage:", splitterCounts);
  console.log(
    "Top 25 parenthesized tokens:",
    [...levels.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
