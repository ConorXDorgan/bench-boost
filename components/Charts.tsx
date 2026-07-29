"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ResourceDto } from "@/lib/resourceDto";

const BUCKET_COLOR: Record<ResourceDto["bucket"], string> = {
  available: "#00b5a0",
  coming: "#f39800",
  not_available: "#8c8c95",
};

const BUCKET_LABEL: Record<ResourceDto["bucket"], string> = {
  available: "Available",
  coming: "Coming",
  not_available: "Not Available",
};

interface ChartsProps {
  resources: ResourceDto[];
}

const TOOLTIP_STYLE: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid #e5e5e5",
  borderRadius: 8,
  fontSize: 12,
  padding: "8px 10px",
  boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
};

const AXIS_TICK = { fontSize: 11, fill: "#6b6b6b" };
const AXIS_LINE = { stroke: "#e5e5e5" };

export default function Charts({ resources }: ChartsProps) {
  const bucketData = useMemo(() => {
    const counts = { available: 0, coming: 0, not_available: 0 };
    for (const r of resources) counts[r.bucket]++;
    return (Object.keys(counts) as Array<keyof typeof counts>).map((key) => ({
      name: BUCKET_LABEL[key],
      value: counts[key],
      color: BUCKET_COLOR[key],
    }));
  }, [resources]);

  const timelineData = useMemo(() => buildTimelineBins(resources), [resources]);

  /**
   * "Practice" is the renamed Org Unit Level 4 field (e.g. "Cloud",
   * "Software & Platform Engineering", "Infrastructure Engineering").
   * Aggregates the top 8 practices for available + coming-available
   * resources.
   */
  const practiceData = useMemo(() => {
    const counts = new Map<string, { available: number; coming: number }>();
    for (const r of resources) {
      if (r.bucket !== "available" && r.bucket !== "coming") continue;
      const key = r.orgUnitL4 ?? "(Unknown)";
      const cur = counts.get(key) ?? { available: 0, coming: 0 };
      cur[r.bucket]++;
      counts.set(key, cur);
    }
    return [...counts.entries()]
      .map(([name, v]) => ({ name, ...v, total: v.available + v.coming }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [resources]);

  const levelData = useMemo(() => buildLevelBreakdown(resources), [resources]);

  return (
    <section className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
      <ChartCard title="Bench distribution" subtitle="All resources by bucket">
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie
              data={bucketData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={56}
              outerRadius={88}
              paddingAngle={3}
              stroke="#ffffff"
              strokeWidth={2}
              label={({ name, value }) => `${name}: ${value}`}
            >
              {bucketData.map((d) => (
                <Cell key={d.name} fill={d.color} />
              ))}
            </Pie>
            <Tooltip contentStyle={TOOLTIP_STYLE} />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="Time to staffability"
        subtitle="When does the bench become available?"
      >
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={timelineData} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
            <XAxis
              dataKey="label"
              tick={AXIS_TICK}
              axisLine={AXIS_LINE}
              tickLine={false}
            />
            <YAxis
              tick={AXIS_TICK}
              axisLine={AXIS_LINE}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              cursor={{ fill: "#f5f5f5" }}
              formatter={(value) => [`${value} resources`, "Count"]}
            />
            <Bar dataKey="count" radius={[6, 6, 0, 0]}>
              {timelineData.map((d) => (
                <Cell key={d.label} fill={d.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="Top practices on bench"
        subtitle="Available + Coming, grouped by Practice (top 8)"
      >
        <ResponsiveContainer width="100%" height={Math.max(240, practiceData.length * 30 + 60)}>
          <BarChart data={practiceData} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
            <XAxis
              type="number"
              tick={AXIS_TICK}
              axisLine={AXIS_LINE}
              tickLine={false}
              allowDecimals={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={170}
              tick={{ fontSize: 11, fill: "#1a1a1a" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "#f5f5f5" }} />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} iconType="circle" iconSize={8} />
            <Bar dataKey="available" stackId="a" name="Available" fill={BUCKET_COLOR.available} />
            <Bar
              dataKey="coming"
              stackId="a"
              name="Coming"
              fill={BUCKET_COLOR.coming}
              radius={[0, 6, 6, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="Bench by management level"
        subtitle="Available + Coming, grouped by Accenture level (most senior on top)"
      >
        {levelData.length === 0 ? (
          <p className="py-12 text-center text-sm text-neutral-500">
            No level data on the bench right now.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(240, levelData.length * 30 + 60)}>
            <BarChart data={levelData} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
              <XAxis
                type="number"
                tick={AXIS_TICK}
                axisLine={AXIS_LINE}
                tickLine={false}
                allowDecimals={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={170}
                tick={{ fontSize: 11, fill: "#1a1a1a" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "#f5f5f5" }} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} iconType="circle" iconSize={8} />
              <Bar dataKey="available" stackId="lvl" name="Available" fill={BUCKET_COLOR.available} />
              <Bar
                dataKey="coming"
                stackId="lvl"
                name="Coming"
                fill={BUCKET_COLOR.coming}
                radius={[0, 6, 6, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
    </section>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-neutral-200 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition hover:shadow-[0_8px_24px_rgba(161,0,255,0.06)]">
      <div className="absolute left-0 top-0 h-full w-1 bg-[color:var(--acn-purple)] opacity-0 transition group-hover:opacity-100" />
      <h3 className="text-sm font-semibold tracking-tight text-black">{title}</h3>
      {subtitle && <p className="mb-4 mt-0.5 text-xs text-neutral-500">{subtitle}</p>}
      {children}
    </div>
  );
}

function buildTimelineBins(resources: ResourceDto[]) {
  const bins: Array<{ label: string; from: number; to: number; color: string; count: number }> = [
    { label: "Now (≤0 wks)", from: -Infinity, to: 0, color: "#00b5a0", count: 0 },
    { label: "1–2 wks", from: 1, to: 2, color: "#26c2af", count: 0 },
    { label: "2–4 wks", from: 3, to: 4, color: "#a100ff", count: 0 },
    { label: "4–8 wks", from: 5, to: 8, color: "#c26eff", count: 0 },
    { label: "8–12 wks", from: 9, to: 12, color: "#f39800", count: 0 },
    { label: "12+ wks", from: 13, to: Infinity, color: "#8c8c95", count: 0 },
  ];

  for (const r of resources) {
    if (r.weeksOut == null) continue;
    const w = r.weeksOut;
    for (const bin of bins) {
      if (w >= bin.from && w <= bin.to) {
        bin.count++;
        break;
      }
    }
  }
  return bins;
}

/**
 * Aggregate staffable resources by Accenture management level.
 *
 * `managementLevel` values in the snapshot look like "11-Analyst",
 * "6-Senior Manager", or the un-numbered "Accenture Leadership" tier for
 * MDs and above. We sort by the leading number ascending (most senior at
 * the top of the y-axis), keeping "Accenture Leadership" above the
 * numbered ranks since it represents the most-senior tier.
 */
function buildLevelBreakdown(resources: ResourceDto[]) {
  type Row = {
    name: string;
    order: number;
    available: number;
    coming: number;
    total: number;
  };
  const counts = new Map<string, Row>();

  for (const r of resources) {
    if (r.bucket !== "available" && r.bucket !== "coming") continue;
    const raw = r.managementLevel?.trim();
    const name = raw && raw.length > 0 ? raw : "(Unknown)";
    const match = raw?.match(/^(\d+)/);
    const order = match ? parseInt(match[1], 10) : raw === "(Unknown)" ? 99 : -1;
    const cur =
      counts.get(name) ?? { name, order, available: 0, coming: 0, total: 0 };
    if (r.bucket === "available") cur.available++;
    else cur.coming++;
    cur.total++;
    counts.set(name, cur);
  }

  // Recharts renders the first item in the array at the BOTTOM of a
  // horizontal bar chart, so reverse the senior-first order before
  // returning to put the most-senior rank visually on top.
  return [...counts.values()]
    .sort((a, b) => a.order - b.order)
    .reverse();
}
