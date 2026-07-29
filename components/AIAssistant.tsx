"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import AccentureLogoLoader from "@/components/AccentureLogoLoader";
import TypewriterTitle from "@/components/TypewriterTitle";
import type { StaffingResponse } from "@/lib/ai/prompt";

interface Props {
  snapshotDate: string | null;
  benchSize: number;
}

type Status = "idle" | "loading" | "result" | "error";

const SUGGESTIONS = [
  "Senior Salesforce solution architect to lead a 6-month CRM migration for a public-sector client",
  "Cloud data engineer with Snowflake + dbt experience, available within 2 weeks",
  "Manager-level Java backend dev for a regulated banking project, Dublin preferred",
];

interface AttachedFile {
  name: string;
  chars: number;
  truncated: boolean;
}

export default function AIAssistant({ snapshotDate, benchSize }: Props) {
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [response, setResponse] = useState<StaffingResponse | null>(null);
  const [submittedBrief, setSubmittedBrief] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");

  // File-upload state for job-spec / proposal ingestion.
  const [attachedFile, setAttachedFile] = useState<AttachedFile | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const focusInput = useCallback(() => {
    requestAnimationFrame(() => textareaRef.current?.focus());
  }, []);

  useEffect(() => {
    if (status === "idle") focusInput();
  }, [status, focusInput]);

  const uploadFile = useCallback(async (file: File) => {
    setExtracting(true);
    setExtractError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/ai/extract-file", {
        method: "POST",
        body: formData,
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body?.ok) {
        throw new Error(
          typeof body?.error === "string"
            ? body.error
            : `Upload failed (${res.status})`,
        );
      }
      setInput(body.text as string);
      setAttachedFile({
        name: body.fileName as string,
        chars: body.chars as number,
        truncated: Boolean(body.truncated),
      });
    } catch (err) {
      setExtractError(
        err instanceof Error ? err.message : "Failed to read the file.",
      );
    } finally {
      setExtracting(false);
    }
  }, []);

  const clearAttachedFile = useCallback(() => {
    setAttachedFile(null);
    setExtractError(null);
  }, []);

  const canSubmit = input.trim().length > 0 && status !== "loading" && benchSize > 0;

  const submit = useCallback(async () => {
    const brief = input.trim();
    if (!brief) return;
    setStatus("loading");
    setErrorMsg("");
    setResponse(null);
    setSubmittedBrief(brief);
    try {
      const res = await fetch("/api/ai/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body?.ok) {
        throw new Error(typeof body?.error === "string" ? body.error : `Request failed (${res.status})`);
      }
      setResponse(body.data as StaffingResponse);
      setStatus("result");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong.");
      setStatus("error");
    }
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && canSubmit) {
      e.preventDefault();
      submit();
    }
  };

  const reset = () => {
    setStatus("idle");
    setResponse(null);
    setErrorMsg("");
    setSubmittedBrief("");
    focusInput();
  };

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col bg-neutral-50">
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-4 py-10 sm:px-6">
        {status === "idle" && (
          <Hero
            snapshotDate={snapshotDate}
            benchSize={benchSize}
            disabled={benchSize === 0}
            input={input}
            setInput={(v) => {
              // If the user starts editing the textarea, the file chip
              // remains as provenance — but a manual clear should clear
              // both. We only auto-clear the chip when input is wiped.
              setInput(v);
              if (v.length === 0) setAttachedFile(null);
            }}
            onSubmit={submit}
            canSubmit={canSubmit}
            onKeyDown={handleKeyDown}
            textareaRef={textareaRef}
            onPickSuggestion={(s) => {
              setInput(s);
              setAttachedFile(null);
              focusInput();
            }}
            attachedFile={attachedFile}
            extracting={extracting}
            extractError={extractError}
            onUpload={uploadFile}
            onClearFile={() => {
              clearAttachedFile();
              setInput("");
              focusInput();
            }}
          />
        )}

        {status === "loading" && (
          <div className="w-full max-w-xl">
            <div className="rounded-2xl border border-neutral-200 bg-white px-6 py-8 shadow-sm">
              <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.16em] text-neutral-500">
                Your brief
              </p>
              <p className="whitespace-pre-wrap text-sm text-black">{submittedBrief}</p>
            </div>
            <div className="mt-4 rounded-2xl border border-neutral-200 bg-white shadow-sm">
              <AccentureLogoLoader />
            </div>
          </div>
        )}

        {status === "result" && response && (
          <ResultView brief={submittedBrief} response={response} onReset={reset} />
        )}

        {status === "error" && (
          <div className="w-full max-w-xl rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-900 shadow-sm">
            <p className="text-sm font-semibold">The AI couldn&apos;t respond</p>
            <p className="mt-1 text-sm">{errorMsg}</p>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => submit()}
                className="rounded-full bg-black px-4 py-1.5 text-xs font-medium text-white transition hover:bg-[color:var(--acn-purple)]"
              >
                Try again
              </button>
              <button
                onClick={reset}
                className="rounded-full border border-rose-300 px-4 py-1.5 text-xs font-medium text-rose-900 hover:bg-white"
              >
                Edit brief
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

/* -------------------- Idle hero -------------------- */

function Hero({
  snapshotDate,
  benchSize,
  disabled,
  input,
  setInput,
  onSubmit,
  canSubmit,
  onKeyDown,
  textareaRef,
  onPickSuggestion,
  attachedFile,
  extracting,
  extractError,
  onUpload,
  onClearFile,
}: {
  snapshotDate: string | null;
  benchSize: number;
  disabled: boolean;
  input: string;
  setInput: (v: string) => void;
  onSubmit: () => void;
  canSubmit: boolean;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  onPickSuggestion: (s: string) => void;
  attachedFile: AttachedFile | null;
  extracting: boolean;
  extractError: string | null;
  onUpload: (file: File) => void;
  onClearFile: () => void;
}) {
  return (
    <div className="flex w-full flex-col items-center text-center">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-600 shadow-sm">
        <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--acn-purple)]" />
        AI Staffing Assistant
      </span>
      <p className="mt-3 text-[11px] text-neutral-500">
        {benchSize > 0 ? (
          <>
            Snapshot{" "}
            <span className="font-medium text-neutral-800">{snapshotDate ?? "—"}</span>
            <span className="mx-1.5 text-neutral-300">·</span>
            <span className="font-medium text-neutral-800">{benchSize.toLocaleString()}</span>{" "}
            staffable people
          </>
        ) : (
          <>No bench snapshot loaded</>
        )}
      </p>

      <TypewriterTitle
        text="Who do you need to staff"
        highlight="?"
        className="mt-6 text-4xl font-semibold tracking-tight text-black sm:text-5xl"
        highlightClassName="text-[color:var(--acn-purple)]"
      />
      <p className="mt-4 max-w-xl text-sm text-neutral-600 sm:text-base">
        Describe the role, the client context, and any must-have skills. The AI will read the
        current bench, weigh skills, availability and seniority, and recommend the best fits.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (canSubmit) onSubmit();
        }}
        className="mt-8 w-full max-w-2xl"
      >
        <div
          className={`group relative overflow-hidden rounded-2xl border bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition focus-within:border-[color:var(--acn-purple)] focus-within:shadow-[0_8px_30px_rgba(161,0,255,0.08)] ${
            disabled ? "border-neutral-200 opacity-60" : "border-neutral-200"
          }`}
        >
          {attachedFile && (
            <div className="flex items-center gap-2 border-b border-neutral-100 bg-[color:var(--acn-purple-50)]/40 px-4 py-2 text-left text-xs text-neutral-700">
              <FileIcon />
              <span className="truncate">
                Loaded from{" "}
                <span className="font-medium text-black">{attachedFile.name}</span>
                <span className="text-neutral-500">
                  {" "}
                  · {attachedFile.chars.toLocaleString()} chars
                </span>
                {attachedFile.truncated && (
                  <span className="text-amber-700"> · truncated to 50k chars</span>
                )}
              </span>
              <button
                type="button"
                onClick={onClearFile}
                className="ml-auto rounded-full p-1 text-neutral-500 transition hover:bg-white hover:text-black"
                aria-label="Remove attached file"
              >
                ×
              </button>
            </div>
          )}

          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={disabled}
            rows={5}
            placeholder={
              disabled
                ? "Seed or upload a bench workbook first."
                : "Describe the role, paste a job spec, or upload a PDF/Word doc below."
            }
            className="block max-h-72 min-h-[8rem] w-full resize-y bg-transparent px-5 py-4 text-left text-sm text-black placeholder:text-neutral-400 focus:outline-none"
          />
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 bg-neutral-50/60 px-3 py-2.5">
            <FileUploadButton
              disabled={disabled || extracting}
              extracting={extracting}
              hasFile={Boolean(attachedFile)}
              onPickFile={onUpload}
            />
            <div className="flex items-center gap-2">
              <span className="hidden text-[11px] text-neutral-400 sm:inline">
                ⌘/Ctrl + Enter
              </span>
              <button
                type="submit"
                disabled={!canSubmit}
                className="inline-flex items-center gap-1.5 rounded-full bg-black px-4 py-1.5 text-xs font-medium text-white transition hover:bg-[color:var(--acn-purple)] disabled:cursor-not-allowed disabled:bg-neutral-300"
              >
                Find candidates
                <span aria-hidden="true">›</span>
              </button>
            </div>
          </div>
        </div>

        {extractError && (
          <p className="mt-2 text-left text-xs text-rose-700">{extractError}</p>
        )}

        {!disabled && !attachedFile && input.length === 0 && (
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <span className="text-[11px] uppercase tracking-wider text-neutral-500">
              Try
            </span>
            {SUGGESTIONS.map((s) => (
              <button
                type="button"
                key={s}
                onClick={() => onPickSuggestion(s)}
                className="max-w-xs truncate rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs text-neutral-700 shadow-sm transition hover:border-[color:var(--acn-purple)] hover:text-[color:var(--acn-purple)]"
                title={s}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </form>
    </div>
  );
}

/* -------------------- Result view -------------------- */

function ResultView({
  brief,
  response,
  onReset,
}: {
  brief: string;
  response: StaffingResponse;
  onReset: () => void;
}) {
  return (
    <div className="w-full max-w-3xl space-y-5">
      <div className="rounded-2xl border border-neutral-200 bg-white px-6 py-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-neutral-500">
              Your brief
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-black">{brief}</p>
          </div>
          <button
            onClick={onReset}
            className="shrink-0 rounded-full border border-neutral-200 px-3 py-1.5 text-xs font-medium text-black transition hover:border-[color:var(--acn-purple)] hover:text-[color:var(--acn-purple)]"
          >
            New search
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-900">
          <span className="h-px w-4 bg-[color:var(--acn-purple)]" />
          Summary
        </h2>
        <p className="mt-2 text-sm text-neutral-700">{response.summary}</p>

        {response.noFitNote && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            <strong className="font-semibold">Heads up: </strong>
            {response.noFitNote}
          </div>
        )}
      </div>

      {response.candidates.length > 0 && (
        <div className="space-y-3">
          {response.candidates.map((c, i) => (
            <CandidateCard key={c.eid + i} index={i + 1} candidate={c} />
          ))}
        </div>
      )}
    </div>
  );
}

function CandidateCard({
  index,
  candidate,
}: {
  index: number;
  candidate: StaffingResponse["candidates"][number];
}) {
  const score = Math.max(0, Math.min(100, candidate.fitScore || 0));
  const initials = candidate.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  return (
    <article className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition hover:shadow-[0_8px_24px_rgba(161,0,255,0.06)]">
      <div className="flex flex-wrap items-start justify-between gap-4 p-5">
        <div className="flex items-start gap-3">
          <span className="acn-gradient-purple inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white shadow-sm">
            {initials || "·"}
          </span>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">
              #{index}
            </p>
            <h3 className="text-base font-semibold tracking-tight text-black">{candidate.name}</h3>
            <p className="mt-0.5 text-xs text-neutral-500">
              {candidate.eid}
              {candidate.managementLevel ? ` · ${candidate.managementLevel}` : ""}
              {candidate.jobFamily ? ` · ${candidate.jobFamily}` : ""}
            </p>
          </div>
        </div>
        <FitScore score={score} />
      </div>

      <div className="border-t border-neutral-100 px-5 py-4 text-sm">
        <p className="text-neutral-700">{candidate.reasoning}</p>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {candidate.strengths.length > 0 && (
            <div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
                Strengths
              </p>
              <ul className="space-y-1">
                {candidate.strengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-neutral-700">
                    <span className="mt-1 inline-block h-1 w-1 shrink-0 rounded-full bg-[color:var(--acn-purple)]" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {candidate.caveats.length > 0 && (
            <div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
                Caveats
              </p>
              <ul className="space-y-1">
                {candidate.caveats.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-neutral-700">
                    <span className="mt-1 inline-block h-1 w-1 shrink-0 rounded-full bg-amber-500" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-neutral-100 bg-neutral-50/70 px-5 py-3 text-xs text-neutral-600">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--acn-purple)]" />
          {candidate.availability}
        </span>
        {candidate.firstStaffable && (
          <>
            <span className="text-neutral-300">·</span>
            <span>First staffable {candidate.firstStaffable}</span>
          </>
        )}
        <div className="ml-auto flex items-center gap-2">
          {candidate.email ? (
            <a
              href={`mailto:${candidate.email}?subject=${encodeURIComponent(
                `Bench availability — ${candidate.name}`,
              )}`}
              className="inline-flex items-center gap-1.5 rounded-full bg-black px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-[color:var(--acn-purple)]"
            >
              <MailIcon />
              Contact
            </a>
          ) : (
            <span
              className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-full border border-dashed border-neutral-200 px-3 py-1.5 text-xs text-neutral-400"
              title="No email address on record"
            >
              <MailIcon />
              Contact
            </span>
          )}
          {candidate.workdayUrl ? (
            <a
              href={candidate.workdayUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-black shadow-sm transition hover:border-[color:var(--acn-purple)] hover:text-[color:var(--acn-purple)]"
            >
              Workday
              <span aria-hidden="true">↗</span>
            </a>
          ) : (
            <span
              className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-full border border-dashed border-neutral-200 px-3 py-1.5 text-xs text-neutral-400"
              title="No Workday link on record"
            >
              Workday
              <span aria-hidden="true">↗</span>
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

function FileUploadButton({
  disabled,
  extracting,
  hasFile,
  onPickFile,
}: {
  disabled: boolean;
  extracting: boolean;
  hasFile: boolean;
  onPickFile: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    if (disabled) return;
    inputRef.current?.click();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) onPickFile(file);
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 shadow-sm transition hover:border-[color:var(--acn-purple)] hover:text-[color:var(--acn-purple)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {extracting ? (
          <>
            <Spinner />
            Extracting…
          </>
        ) : (
          <>
            <PaperclipIcon />
            {hasFile ? "Replace spec" : "Upload spec"}
          </>
        )}
      </button>
      <span className="hidden text-[11px] text-neutral-400 md:inline">
        PDF, DOCX, TXT — up to 10 MB
      </span>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown"
        className="hidden"
        onChange={handleChange}
      />
    </div>
  );
}

function PaperclipIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 17.93 8.83l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0 text-[color:var(--acn-purple)]"
      aria-hidden="true"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M8 13h8M8 17h8M8 9h2" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg
      className="h-3 w-3 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="3"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </svg>
  );
}

function FitScore({ score }: { score: number }) {
  return (
    <div className="flex flex-col items-end">
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-semibold tabular-nums text-black">{score}</span>
        <span className="text-xs text-neutral-500">/ 100</span>
      </div>
      <div className="mt-1 h-1 w-24 overflow-hidden rounded-full bg-neutral-100">
        <div
          className="h-full bg-[color:var(--acn-purple)] transition-all duration-500"
          style={{ width: `${score}%` }}
        />
      </div>
      <p className="mt-0.5 text-[10px] uppercase tracking-wider text-neutral-500">Fit score</p>
    </div>
  );
}
