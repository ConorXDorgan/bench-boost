"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface UploadResult {
  ok?: boolean;
  snapshotDate?: string;
  resourceCount?: number;
  bucketCounts?: { available: number; coming: number; not_available: number };
  error?: string;
  missingColumns?: string[];
}

export default function UploadButton() {
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<UploadResult | null>(null);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPending(true);
    setFeedback(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const body: UploadResult = await res.json();
      setFeedback(body);
      if (res.ok) router.refresh();
    } catch (err) {
      setFeedback({ error: err instanceof Error ? err.message : "Upload failed" });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <button
        type="button"
        disabled={pending}
        onClick={() => inputRef.current?.click()}
        className="group inline-flex items-center gap-2 rounded-full bg-black px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-[color:var(--acn-purple)] disabled:opacity-60"
      >
        {pending ? (
          <>
            <svg
              className="h-3.5 w-3.5 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <circle
                cx="12"
                cy="12"
                r="9"
                stroke="currentColor"
                strokeOpacity="0.3"
                strokeWidth="3"
              />
              <path
                d="M21 12a9 9 0 0 0-9-9"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
            Uploading…
          </>
        ) : (
          <>
            Upload new file
            <span className="text-[color:var(--acn-purple)] transition group-hover:translate-x-0.5 group-hover:text-white">
              ›
            </span>
          </>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx"
        onChange={onChange}
        className="hidden"
      />
      {feedback?.ok && (
        <p className="text-xs text-[color:var(--acn-success)]">
          Loaded {feedback.resourceCount} resources (snapshot {feedback.snapshotDate}).
        </p>
      )}
      {feedback?.error && (
        <p className="max-w-xs text-right text-xs text-rose-700">
          {feedback.error}
          {feedback.missingColumns && feedback.missingColumns.length > 0 && (
            <span className="block text-[10px] text-rose-600/80">
              Missing: {feedback.missingColumns.slice(0, 5).join(", ")}
              {feedback.missingColumns.length > 5 ? "…" : ""}
            </span>
          )}
        </p>
      )}
    </div>
  );
}
