import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { loadFullSnapshot } from "@/lib/snapshotLoader";
import { chatCompletion, OpenRouterError } from "@/lib/ai/openrouter";
import { buildBenchContext } from "@/lib/ai/resourceContext";
import { buildSystemPrompt, type StaffingResponse } from "@/lib/ai/prompt";

// Generous limit so an uploaded job-spec / proposal can fit. The
// MAX_TEXT_CHARS cap in /api/ai/extract-file is set to the same value.
const MAX_BRIEF_CHARS = 50_000;

export async function POST(req: Request) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }

  let body: { brief?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Expected JSON body" }, { status: 400 });
  }

  const brief = typeof body.brief === "string" ? body.brief.trim() : "";
  if (!brief) {
    return NextResponse.json(
      { error: "Describe the role you're trying to staff." },
      { status: 400 },
    );
  }
  if (brief.length > MAX_BRIEF_CHARS) {
    return NextResponse.json(
      { error: `Brief is too long (max ${MAX_BRIEF_CHARS} characters).` },
      { status: 400 },
    );
  }

  const snapshot = await loadFullSnapshot();
  if (!snapshot) {
    return NextResponse.json(
      { error: "No bench snapshot loaded yet. Seed or upload a workbook first." },
      { status: 400 },
    );
  }
  const resources = snapshot.resources;

  const bench = buildBenchContext(resources);
  if (bench.size === 0) {
    return NextResponse.json(
      {
        error:
          "There's nobody available or coming-available on the current snapshot, so there's nothing to recommend.",
      },
      { status: 400 },
    );
  }

  const system = buildSystemPrompt(bench, snapshot.snapshotDate.slice(0, 10));

  let raw: string;
  try {
    raw = await chatCompletion(
      [
        { role: "system", content: system },
        { role: "user", content: brief },
      ],
      { temperature: 0.2, maxTokens: 4000 },
    );
  } catch (err) {
    if (err instanceof OpenRouterError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    console.error("AI staffing call failed", err);
    return NextResponse.json({ error: "AI staffing call failed" }, { status: 500 });
  }

  const parsed = parseStaffingResponse(raw);
  if (!parsed) {
    return NextResponse.json(
      { error: "The AI returned a response we couldn't parse. Try again or rephrase the brief." },
      { status: 502 },
    );
  }

  // Enrich each candidate with contact / Workday URL from the snapshot.
  // The AI never sees these fields — they're plumbed in here keyed on eid
  // so the candidate cards can render Contact and Workday buttons.
  const byEid = new Map(resources.map((r) => [r.eid, r] as const));
  const enriched: typeof parsed = {
    ...parsed,
    candidates: parsed.candidates.map((c) => {
      const r = byEid.get(c.eid);
      return {
        ...c,
        email: r?.email ?? null,
        workdayUrl: r?.workdayUrl ?? null,
      };
    }),
  };

  return NextResponse.json({
    ok: true,
    snapshotDate: snapshot.snapshotDate.slice(0, 10),
    benchSize: bench.size,
    data: enriched,
  });
}

function parseStaffingResponse(raw: string): StaffingResponse | null {
  // Some models wrap JSON in ```json fences even with response_format set.
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  let json: unknown;
  try {
    json = JSON.parse(cleaned);
  } catch {
    return null;
  }
  if (typeof json !== "object" || json === null) return null;
  const obj = json as Record<string, unknown>;
  if (typeof obj.summary !== "string") return null;
  if (!Array.isArray(obj.candidates)) return null;

  const candidates = obj.candidates.flatMap((c) => {
    if (typeof c !== "object" || c === null) return [];
    const cc = c as Record<string, unknown>;
    if (typeof cc.eid !== "string" || typeof cc.name !== "string") return [];
    return [
      {
        eid: cc.eid,
        name: cc.name,
        managementLevel: typeof cc.managementLevel === "string" ? cc.managementLevel : null,
        jobFamily: typeof cc.jobFamily === "string" ? cc.jobFamily : null,
        availability: typeof cc.availability === "string" ? cc.availability : "",
        weeksOut: typeof cc.weeksOut === "number" ? cc.weeksOut : null,
        firstStaffable: typeof cc.firstStaffable === "string" ? cc.firstStaffable : null,
        fitScore: typeof cc.fitScore === "number" ? Math.max(0, Math.min(100, Math.round(cc.fitScore))) : 0,
        strengths: Array.isArray(cc.strengths)
          ? cc.strengths.filter((s): s is string => typeof s === "string")
          : [],
        caveats: Array.isArray(cc.caveats)
          ? cc.caveats.filter((s): s is string => typeof s === "string")
          : [],
        reasoning: typeof cc.reasoning === "string" ? cc.reasoning : "",
        email: null,
        workdayUrl: null,
      },
    ];
  });

  return {
    summary: obj.summary,
    candidates,
    noFitNote: typeof obj.noFitNote === "string" ? obj.noFitNote : null,
  };
}
