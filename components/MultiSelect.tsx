"use client";

import { useEffect, useMemo, useRef, useState } from "react";

interface Props {
  /** Visible label on the trigger button (e.g. "Job Family"). */
  label: string;
  /** Full universe of options to choose from. */
  options: string[];
  /** Currently-selected values. */
  selected: string[];
  /** Called with the new selection on every change. */
  onChange: (next: string[]) => void;
  /** "md" (default) matches the Bench filters; "sm" is a denser variant. */
  size?: "sm" | "md";
}

/**
 * Reusable multi-select pill with a built-in search and clear control.
 *
 * Uses a document-level mousedown listener for outside-click detection
 * rather than an invisible overlay — an overlay would swallow clicks on
 * other interactive elements behind it.
 */
export default function MultiSelect({
  label,
  options,
  selected,
  onChange,
  size = "md",
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  const triggerClasses =
    size === "sm"
      ? "rounded-full border px-3 py-1.5 text-xs shadow-sm"
      : "rounded-full border px-4 py-2 text-sm shadow-sm";

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center gap-1.5 transition ${triggerClasses} ${
          selected.length > 0
            ? "border-[color:var(--acn-purple)] bg-[color:var(--acn-purple-50)] text-[color:var(--acn-purple-700)]"
            : "border-neutral-200 bg-white text-black hover:border-black/40"
        }`}
      >
        {label}
        {selected.length > 0 && (
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[color:var(--acn-purple)] px-1.5 text-[10px] font-semibold text-white">
            {selected.length}
          </span>
        )}
        <span className="text-xs text-neutral-400">▾</span>
      </button>
      {open && (
        <div className="absolute z-20 mt-1.5 max-h-80 w-72 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-xl">
          <div className="border-b border-neutral-200 p-2">
            <input
              autoFocus
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Filter ${label.toLowerCase()}…`}
              className="w-full rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-sm placeholder:text-neutral-400 focus:border-[color:var(--acn-purple)]"
            />
          </div>
          <div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-100 px-3 py-1.5 text-[11px] text-neutral-500">
            <span>
              <span className="font-semibold text-black">{selected.length}</span>
              <span className="mx-1">/</span>
              {options.length} selected
            </span>
            <button
              type="button"
              className="font-medium text-[color:var(--acn-purple)] hover:underline"
              onClick={() => onChange([])}
            >
              Clear
            </button>
          </div>
          <div className="max-h-56 overflow-auto p-1">
            {filteredOptions.map((opt) => {
              const checked = selected.includes(opt);
              return (
                <label
                  key={opt}
                  className={`flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm ${
                    checked
                      ? "bg-[color:var(--acn-purple-50)]"
                      : "hover:bg-neutral-100"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      onChange(
                        checked ? selected.filter((s) => s !== opt) : [...selected, opt],
                      )
                    }
                    className="accent-[color:var(--acn-purple)]"
                  />
                  <span className="truncate text-black">{opt}</span>
                </label>
              );
            })}
            {filteredOptions.length === 0 && (
              <p className="px-2 py-3 text-center text-xs text-neutral-500">No matches</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
