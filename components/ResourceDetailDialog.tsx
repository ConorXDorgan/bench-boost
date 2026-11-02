"use client";

import { useEffect, useRef, useState } from "react";
import Avatar from "@/components/Avatar";
import Spinner from "@/components/Spinner";
import NotesPanel from "@/components/NotesPanel";
import { SkillBubbles, SkillLegend } from "@/components/SkillBubbles";
import {
  BUCKET_DOT,
  BUCKET_LABEL,
  BUCKET_PILL,
  BUCKET_PILL_UNKNOWN,
  fmtDate,
  fmtText,
} from "@/lib/format";
import type { NoteDto, ResourceDetailDto, ResourceListDto } from "@/lib/resourceDto";

interface Props {
  /** The currently-selected resource, or null when the dialog should be closed. */
  resource: ResourceListDto | null;
  /** Called whenever the dialog closes — Esc, backdrop click, or X button. */
  onClose: () => void;
  /** Admins only: shows the notes thread and reports the newest note after edits. */
  showNotes?: boolean;
  onNoteChange?: (eid: string, latest: NoteDto | null) => void;
}

/**
 * Resource detail view.
 *
 * Built on the native `<dialog>` element with `showModal()`, which gives us
 * for free: top-layer rendering (no containing-block traps from transformed
 * ancestors), focus trap, scroll lock, Esc-to-close, accessibility roles.
 *
 * Open/close animations are driven by CSS via `@starting-style` and
 * `transition-behavior: allow-discrete` (see `globals.css` → `.acn-dialog`),
 * so there are no JS timers, no closing-state machine, and no race
 * conditions between mount/unmount and animation completion.
 */
export default function ResourceDetailDialog({
  resource,
  onClose,
  showNotes = false,
  onNoteChange,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  // Keep the most-recent non-null resource cached so the modal contents
  // stay visible during the close transition (resource prop will be null
  // by then). We only ever write to this; we never clear it.
  const [shownResource, setShownResource] = useState<ResourceListDto | null>(resource);
  const [details, setDetails] = useState<Record<string, ResourceDetailDto>>({});
  const [failedId, setFailedId] = useState<string | null>(null);

  if (resource && resource !== shownResource) setShownResource(resource);

  // Sync the native dialog's open state with the `resource` prop.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (resource) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [resource]);

  // Detail-only fields (email, specializations, client, ...) are not part of
  // the list payload; fetch them when a resource is opened.
  const resourceId = resource?.id ?? null;
  const haveDetail = resourceId != null && resourceId in details;
  useEffect(() => {
    if (!resourceId || haveDetail) return;
    const controller = new AbortController();
    fetch(`/api/resources/${encodeURIComponent(resourceId)}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status));
        return res.json() as Promise<ResourceDetailDto>;
      })
      .then((data) => {
        setFailedId(null);
        setDetails((prev) => ({ ...prev, [resourceId]: data }));
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setFailedId(resourceId);
      });
    return () => controller.abort();
  }, [resourceId, haveDetail]);

  // Wire native close events (Esc, dialog.close(), etc.) back to the parent.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handler = () => onClose();
    dialog.addEventListener("close", handler);
    return () => dialog.removeEventListener("close", handler);
  }, [onClose]);

  // A click on the dialog element itself (not its child <section>) is a
  // click on the dialog's content box outside any visible chrome — the
  // backdrop. Close on that.
  const handleClick = (event: React.MouseEvent<HTMLDialogElement>) => {
    if (event.target === event.currentTarget) {
      dialogRef.current?.close();
    }
  };

  return (
    <dialog
      ref={dialogRef}
      onClick={handleClick}
      className="acn-dialog"
      aria-labelledby="resource-detail-heading"
    >
      {shownResource && (
        <DialogContent
          resource={shownResource}
          detail={details[shownResource.id] ?? null}
          failed={failedId === shownResource.id}
          onClose={() => dialogRef.current?.close()}
          showNotes={showNotes}
          onNoteChange={onNoteChange}
        />
      )}
    </dialog>
  );
}

/* -------------------- Dialog content -------------------- */

function DialogContent({
  resource,
  detail,
  failed,
  onClose,
  showNotes,
  onNoteChange,
}: {
  resource: ResourceListDto;
  detail: ResourceDetailDto | null;
  failed: boolean;
  onClose: () => void;
  showNotes: boolean;
  onNoteChange?: (eid: string, latest: NoteDto | null) => void;
}) {
  const pillCls = resource.unknown
    ? BUCKET_PILL_UNKNOWN
    : BUCKET_PILL[resource.bucket];

  return (
    <section className="flex max-h-[90vh] w-[min(48rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5">
      {/* Brand strip */}
      <div className="acn-gradient-purple h-1.5 w-full shrink-0" />

      {/* Header */}
      <header className="flex items-start justify-between gap-4 border-b border-neutral-200 px-6 py-5">
        <div className="flex items-start gap-3">
          <Avatar name={resource.fullName} size="md" />
          <div>
            <h2
              id="resource-detail-heading"
              className="text-xl font-semibold tracking-tight text-black"
            >
              {resource.fullName}
            </h2>
            <p className="mt-0.5 text-xs text-neutral-500">
              {resource.eid} · {fmtText(resource.managementLevel)} ·{" "}
              {fmtText(resource.location)}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1.5 text-neutral-500 transition duration-200 hover:rotate-90 hover:bg-neutral-100 hover:text-black"
          aria-label="Close"
        >
          <CloseIcon />
        </button>
      </header>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-6 px-6 py-6 text-sm">
          <StatusRow resource={resource} pillClass={pillCls} />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
            <Section title="Skills" className="lg:col-span-3">
              <SkillLegend />
              <div className="mt-3">
                <SkillBubbles
                  raw={resource.skills}
                  emptyMessage="No skills recorded."
                />
              </div>
              {detail ? (
                <>
                  <SubList label="Earned specializations" items={detail.specializationsEarned} />
                  <SubList label="Building specializations" items={detail.specializationsBuilding} />
                  <SubList
                    label="Aspirational specializations"
                    items={detail.specializationsAspirational}
                  />
                  <SubList label="Languages" items={detail.languages} />
                  <SubList label="Certifications" items={detail.certifications} />
                </>
              ) : (
                <DetailPlaceholder failed={failed} />
              )}
            </Section>

            <Section title="Current project" className="lg:col-span-2">
              <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                <KV label="Client" value={detail ? detail.currentClient : "…"} />
                <KV label="Project" value={resource.currentProject} />
                <KV
                  label="Start"
                  value={detail ? fmtDate(detail.currentProjectStart) : "…"}
                />
                <KV label="End" value={fmtDate(resource.currentProjectEnd)} />
                <KV
                  label="Roll-off confirmed"
                  value={detail ? detail.rollOffConfirmed : "…"}
                />
                {detail?.currentComments && (
                  <p className="mt-3 whitespace-pre-line rounded-md border-l-2 border-[color:var(--acn-purple)] bg-white p-2.5 text-xs text-neutral-700">
                    {detail.currentComments}
                  </p>
                )}
              </div>
            </Section>
          </div>

          {showNotes && (
            <Section title="Notes">
              <NotesPanel eid={resource.eid} onLatestChange={(eid, latest) => onNoteChange?.(eid, latest)} />
            </Section>
          )}

          <Section title="Links">
            <LinksRow detail={detail} failed={failed} />
          </Section>
        </div>
      </div>
    </section>
  );
}

/* -------------------- Small layout pieces -------------------- */

function StatusRow({
  resource,
  pillClass,
}: {
  resource: ResourceListDto;
  pillClass: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs ring-1 ring-inset ${pillClass}`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${BUCKET_DOT[resource.bucket]}`} />
        {BUCKET_LABEL[resource.bucket]}
      </span>
      <span className="text-xs text-neutral-500">
        First staffable{" "}
        <span className="font-medium text-neutral-700">
          {fmtDate(resource.firstStaffableDate)}
        </span>
        {resource.weeksOut != null ? ` · ${resource.weeksOut} weeks out` : ""}
      </span>
    </div>
  );
}

function DetailPlaceholder({ failed }: { failed: boolean }) {
  if (failed) {
    return (
      <p className="mt-4 text-xs text-rose-700">Couldn&apos;t load the full profile. Close and reopen to retry.</p>
    );
  }
  return (
    <p className="mt-4 inline-flex items-center gap-2 text-xs text-neutral-500">
      <Spinner label="Loading profile" />
      Loading profile…
    </p>
  );
}

function LinksRow({ detail, failed }: { detail: ResourceDetailDto | null; failed: boolean }) {
  if (!detail) return <DetailPlaceholder failed={failed} />;
  const resource = detail;
  return (
    <div className="flex flex-wrap items-center gap-3">
      {resource.workdayUrl ? (
        <a
          href={resource.workdayUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3.5 py-1.5 text-xs font-medium text-black transition hover:border-[color:var(--acn-purple)] hover:text-[color:var(--acn-purple)]"
        >
          Workday profile
          <span aria-hidden="true">↗</span>
        </a>
      ) : (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-neutral-200 px-3.5 py-1.5 text-xs text-neutral-500">
          Workday profile —
        </span>
      )}
      {resource.email ? (
        <a
          href={`mailto:${resource.email}`}
          className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3.5 py-1.5 text-xs font-medium text-black transition hover:border-[color:var(--acn-purple)] hover:text-[color:var(--acn-purple)]"
        >
          Email ({resource.email})
          <span aria-hidden="true">↗</span>
        </a>
      ) : null}
      <span
        className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-neutral-200 px-3.5 py-1.5 text-xs text-neutral-500"
        title="SharePoint integration coming in a later phase"
      >
        CV (coming soon)
      </span>
    </div>
  );
}

function Section({
  title,
  className = "",
  children,
}: {
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={className}>
      <h3 className="mb-3 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-900">
        <span className="h-px w-4 bg-[color:var(--acn-purple)]" />
        {title}
      </h3>
      <div className="space-y-1">{children}</div>
    </section>
  );
}

function KV({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <p className="grid grid-cols-[8rem_1fr] items-baseline gap-2 border-b border-neutral-200/70 py-1.5 text-sm last:border-b-0">
      <span className="text-xs uppercase tracking-wider text-neutral-500">
        {label}
      </span>
      <span className="text-neutral-900">{fmtText(value)}</span>
    </p>
  );
}

function SubList({
  label,
  items,
}: {
  label: string;
  items: string | null;
}) {
  if (!items) return null;
  return (
    <div className="mt-4">
      <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-neutral-500">
        {label}
      </p>
      <SkillBubbles raw={items} />
    </div>
  );
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6 6l12 12M6 18 18 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
