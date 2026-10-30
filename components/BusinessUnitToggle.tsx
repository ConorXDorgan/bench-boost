"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import type { ResourceListDto } from "@/lib/resourceDto";

const ALL = "all";

export function useBusinessUnit(resources: ResourceListDto[]) {
  const searchParams = useSearchParams();

  const businessUnits = useMemo(() => {
    const set = new Set<string>();
    for (const r of resources) if (r.orgUnitL3?.trim()) set.add(r.orgUnitL3);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [resources]);

  const requested = searchParams.get("bu");
  const businessUnit = requested && businessUnits.includes(requested) ? requested : ALL;

  const filtered = useMemo(
    () => (businessUnit === ALL ? resources : resources.filter((r) => r.orgUnitL3 === businessUnit)),
    [resources, businessUnit],
  );

  function setBusinessUnit(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === ALL) params.delete("bu");
    else params.set("bu", next);
    const qs = params.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  }

  return { businessUnits, businessUnit, setBusinessUnit, resources: filtered };
}

export default function BusinessUnitToggle({
  businessUnits,
  value,
  onChange,
}: {
  businessUnits: string[];
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Business unit"
      className="inline-flex flex-wrap overflow-hidden rounded-full border border-neutral-200 bg-white p-1 text-sm font-medium shadow-sm"
    >
      {[ALL, ...businessUnits].map((bu) => (
        <button
          key={bu}
          type="button"
          role="radio"
          aria-checked={value === bu}
          onClick={() => onChange(bu)}
          className={`rounded-full px-4 py-1.5 transition ${
            value === bu ? "bg-black text-white" : "text-neutral-700 hover:text-black"
          }`}
        >
          {bu === ALL ? "All business units" : bu}
        </button>
      ))}
    </div>
  );
}
