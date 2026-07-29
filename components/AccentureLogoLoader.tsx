"use client";

import { useEffect, useState } from "react";

const STATUS_MESSAGES = [
  "Reading the bench data",
  "Reviewing skill profiles",
  "Matching availability windows",
  "Weighing seniority and timing",
  "Scoring candidate fit",
  "Drafting recommendations",
];

interface Props {
  /** Optional fixed status label. If omitted, status messages cycle automatically. */
  label?: string;
  /** Estimated wait time shown beneath the status, e.g. "10–20 seconds". */
  hint?: string;
}

export default function AccentureLogoLoader({ label, hint }: Props) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (label) return;
    const interval = window.setInterval(() => {
      setIdx((i) => (i + 1) % STATUS_MESSAGES.length);
    }, 2400);
    return () => window.clearInterval(interval);
  }, [label]);

  const message = label ?? STATUS_MESSAGES[idx];

  return (
    <div
      className="flex flex-col items-center justify-center gap-6 py-8 text-center"
      role="status"
      aria-live="polite"
    >
      {/* Three layered chevron strokes that draw in then sweep off, leaving a comet trail */}
      <div className="acn-logo-pulse relative h-28 w-28">
        <ChevronStroke className="acn-logo-stroke" />
        <ChevronStroke className="acn-logo-stroke acn-logo-stroke-2" opacity={0.5} />
        <ChevronStroke className="acn-logo-stroke acn-logo-stroke-3" opacity={0.22} />
      </div>

      {/* Brand wordmark + animated brand underline */}
      <div className="flex flex-col items-center">
        <span className="acn-logo-wordmark text-2xl font-semibold tracking-[-0.02em] text-black">
          accenture
          <span className="text-[color:var(--acn-purple)]">.</span>
        </span>
        <span className="mt-1.5 block h-[2px] w-28 origin-left rounded-full bg-[color:var(--acn-purple)] acn-logo-underline" />
      </div>

      {/* Cycling status copy */}
      <div className="min-h-[2.5rem] max-w-sm">
        <p
          key={message}
          className="acn-status-swap inline-flex items-center gap-1 text-sm font-medium text-black"
        >
          {message}
          <span className="ml-0.5 inline-flex items-center gap-0.5">
            <span className="acn-logo-dot inline-block h-1 w-1 rounded-full bg-[color:var(--acn-purple)]" />
            <span className="acn-logo-dot acn-logo-dot-2 inline-block h-1 w-1 rounded-full bg-[color:var(--acn-purple)]" />
            <span className="acn-logo-dot acn-logo-dot-3 inline-block h-1 w-1 rounded-full bg-[color:var(--acn-purple)]" />
          </span>
        </p>
        <p className="mt-1.5 text-xs text-neutral-500">
          {hint ?? "The AI is analysing the bench — typically takes 10–20 seconds."}
        </p>
      </div>
    </div>
  );
}

function ChevronStroke({
  className,
  opacity = 1,
}: {
  className: string;
  opacity?: number;
}) {
  return (
    <svg
      viewBox="0 0 100 100"
      className="absolute inset-0 h-full w-full text-[color:var(--acn-purple)]"
      style={{ opacity }}
      aria-hidden="true"
    >
      <path
        d="M 28 18 L 78 50 L 28 82"
        stroke="currentColor"
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        className={className}
      />
    </svg>
  );
}
