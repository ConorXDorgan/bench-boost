"use client";

import { BUCKETS, BUCKET_DOT, BUCKET_LABEL, toggleBucket, type BucketFilter } from "@/lib/format";

interface Props {
  selected: BucketFilter;
  onChange: (next: BucketFilter) => void;
  size?: "sm" | "md";
}

export default function BucketCheckboxes({ selected, onChange, size = "md" }: Props) {
  const pad = size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm";
  return (
    <fieldset className="inline-flex flex-wrap items-center gap-1.5">
      <legend className="sr-only">Availability</legend>
      {BUCKETS.map((b) => {
        const checked = selected.includes(b);
        return (
          <label
            key={b}
            className={`inline-flex cursor-pointer select-none items-center gap-2 rounded-full border bg-white shadow-sm transition ${pad} ${
              checked
                ? "border-black/40 text-black"
                : "border-neutral-200 text-neutral-400 hover:border-black/30"
            }`}
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={() => onChange(toggleBucket(selected, b))}
              className="h-3.5 w-3.5 accent-[color:var(--acn-purple)]"
            />
            <span className={`h-1.5 w-1.5 rounded-full ${BUCKET_DOT[b]}`} />
            {BUCKET_LABEL[b]}
          </label>
        );
      })}
    </fieldset>
  );
}
