"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Spinner from "@/components/Spinner";

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
  const [uploading, setUploading] = useState(false);
  const [refreshing, startRefresh] = useTransition();
  const pending = uploading || refreshing;
  const [feedback, setFeedback] = useState<UploadResult | null>(null);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setFeedback(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const body: UploadResult = await res.json();
      setFeedback(body);
      if (res.ok) startRefresh(() => router.refresh());
    } catch (err) {
      setFeedback({ error: err instanceof Error ? err.message : "Upload failed" });
    } finally {
      setUploading(false);
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
            <Spinner label={uploading ? "Uploading" : "Refreshing dashboard"} />
            {uploading ? "Uploading…" : "Refreshing dashboard…"}
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
