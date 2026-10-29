"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

type Phase = "typing" | "highlight" | "done";

interface Props {
  /** Main text body that types out one character at a time. */
  text: string;
  /** Trailing highlight (e.g. a purple "?") that appears AFTER typing completes. */
  highlight?: string;
  /** Per-character delay in milliseconds. Default 55ms. */
  speed?: number;
  /** Pause after typing before the highlight appears. */
  highlightDelay?: number;
  /** How long the cursor lingers after the highlight before fading out. */
  cursorLinger?: number;
  /** Classes applied to the outer <h1>. */
  className?: string;
  /** Classes applied to the highlight span. */
  highlightClassName?: string;
}

/**
 * Typewriter heading used on the AI page hero. To avoid the surrounding
 * layout shifting as characters appear, we render an invisible full-text
 * copy underneath the animated layer so the parent always sees the final
 * dimensions. Respects `prefers-reduced-motion`.
 */
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void) {
  const mq = window.matchMedia(REDUCED_MOTION_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

export default function TypewriterTitle({
  text,
  highlight = "",
  speed = 55,
  highlightDelay = 180,
  cursorLinger = 1400,
  className = "",
  highlightClassName = "",
}: Props) {
  const [animPhase, setPhase] = useState<Phase>("typing");
  const [animChars, setCharsShown] = useState(0);
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
    () => false,
  );
  const phase: Phase = reducedMotion ? "done" : animPhase;
  const charsShown = reducedMotion ? text.length : animChars;

  useEffect(() => {
    if (reducedMotion) return;

    if (phase === "typing") {
      if (charsShown < text.length) {
        const t = window.setTimeout(() => setCharsShown((c) => c + 1), speed);
        return () => window.clearTimeout(t);
      }
      const t = window.setTimeout(() => setPhase("highlight"), highlightDelay);
      return () => window.clearTimeout(t);
    }

    if (phase === "highlight") {
      const t = window.setTimeout(() => setPhase("done"), cursorLinger);
      return () => window.clearTimeout(t);
    }
  }, [phase, charsShown, reducedMotion, speed, text.length, highlightDelay, cursorLinger]);

  const visibleText = text.slice(0, charsShown);

  return (
    <h1 className={`relative ${className}`}>
      {/* Invisible full-text layer reserves the final dimensions — INCLUDING
          the cursor's footprint — so the surrounding layout doesn't reflow
          as characters appear, and the cursor never wraps to a new line. */}
      <span className="invisible select-none" aria-hidden="true">
        {text}
        {highlight}
        <span className="acn-typewriter-cursor" />
      </span>

      {/* Animated layer */}
      <span className="absolute inset-0">
        <span>{visibleText}</span>
        {phase !== "typing" && (
          <span className={highlightClassName}>{highlight}</span>
        )}
        {phase !== "done" && (
          <span className="acn-typewriter-cursor" aria-hidden="true" />
        )}
      </span>

      {/* Make sure assistive tech announces the final phrase, not a stream
          of growing slices. */}
      <span className="sr-only">
        {text}
        {highlight}
      </span>
    </h1>
  );
}
