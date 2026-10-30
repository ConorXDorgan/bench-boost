"use client";

import { useEffect, useState, type FormEvent } from "react";
import Spinner from "@/components/Spinner";
import { MAX_NOTE_CHARS, type NoteDto } from "@/lib/resourceDto";

interface Props {
  eid: string;
  onLatestChange: (eid: string, latest: NoteDto | null) => void;
}

function fmtNoteTime(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function NotesPanel({ eid, onLatestChange }: Props) {
  const [loaded, setLoaded] = useState<{ eid: string; notes: NoteDto[] } | null>(null);
  const [loadFailedFor, setLoadFailedFor] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const notes = loaded?.eid === eid ? loaded.notes : null;

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/notes?eid=${encodeURIComponent(eid)}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status));
        return res.json() as Promise<{ notes: NoteDto[] }>;
      })
      .then((data) => {
        setLoadFailedFor(null);
        setLoaded({ eid, notes: data.notes });
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setLoadFailedFor(eid);
      });
    return () => controller.abort();
  }, [eid]);

  function update(next: NoteDto[]) {
    setLoaded({ eid, notes: next });
    onLatestChange(eid, next[0] ?? null);
  }

  async function onAdd(e: FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body || !notes) return;
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eid, body }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Couldn't save the note.");
      update([data.note as NoteDto, ...notes]);
      setDraft("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save the note.");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id: string) {
    if (!notes || !window.confirm("Delete this note?")) return;
    setError(null);
    setDeletingId(id);
    try {
      const res = await fetch(`/api/notes/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      update(notes.filter((n) => n.id !== id));
    } catch {
      setError("Couldn't delete the note.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <form onSubmit={onAdd} className="space-y-2">
        <label htmlFor="note-draft" className="sr-only">
          Add a note
        </label>
        <textarea
          id="note-draft"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={MAX_NOTE_CHARS}
          rows={2}
          placeholder="e.g. To be extended, Stephen to reach out and confirm"
          className="w-full resize-y rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-[color:var(--acn-purple)] focus:outline-none"
        />
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-neutral-500">Notes are only visible to admins and are kept across imports.</p>
          <button
            type="submit"
            disabled={saving || !notes || !draft.trim()}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-[color:var(--acn-purple)] px-3.5 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {saving && <Spinner label="Saving note" />}
            Add note
          </button>
        </div>
      </form>

      {error && (
        <p role="alert" className="mt-2 text-xs text-rose-700">
          {error}
        </p>
      )}

      <div className="mt-4">
        {notes == null ? (
          loadFailedFor === eid ? (
            <p className="text-xs text-rose-700">Couldn&apos;t load notes. Close and reopen to retry.</p>
          ) : (
            <p className="inline-flex items-center gap-2 text-xs text-neutral-500">
              <Spinner label="Loading notes" />
              Loading notes…
            </p>
          )
        ) : notes.length === 0 ? (
          <p className="text-xs text-neutral-500">No notes yet.</p>
        ) : (
          <ul className="space-y-2">
            {notes.map((n) => (
              <li
                key={n.id}
                className="rounded-lg border-l-2 border-[color:var(--acn-purple)] bg-neutral-50 px-3 py-2"
              >
                <p className="whitespace-pre-line text-sm text-neutral-800">{n.body}</p>
                <div className="mt-1 flex items-center justify-between gap-3 text-[11px] text-neutral-500">
                  <span>
                    {n.authorName} · {fmtNoteTime(n.createdAt)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onDelete(n.id)}
                    disabled={deletingId === n.id}
                    className="font-medium text-neutral-500 hover:text-rose-700 disabled:opacity-50"
                  >
                    {deletingId === n.id ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
