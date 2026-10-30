"use client";

import { useState, type FormEvent } from "react";
import Spinner from "@/components/Spinner";
import { fmtDate } from "@/lib/format";

interface Status {
  enabled: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
}

export default function ViewerPasswordForm({ initial }: { initial: Status }) {
  const [status, setStatus] = useState(initial);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState<"save" | "disable" | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function send(method: "PUT" | "DELETE", body?: object) {
    const res = await fetch("/api/admin/viewer-password", {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
    return data as { updatedAt: string; updatedBy: string | null };
  }

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    if (password !== confirm) {
      setMessage({ ok: false, text: "Passwords don't match." });
      return;
    }
    setPending("save");
    try {
      const data = await send("PUT", { password });
      setStatus({ enabled: true, updatedAt: data.updatedAt, updatedBy: data.updatedBy });
      setPassword("");
      setConfirm("");
      setMessage({ ok: true, text: "Viewer password saved. Existing viewers have been signed out." });
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Something went wrong." });
    } finally {
      setPending(null);
    }
  }

  async function onDisable() {
    setMessage(null);
    setPending("disable");
    try {
      const data = await send("DELETE");
      setStatus({ enabled: false, updatedAt: data.updatedAt, updatedBy: data.updatedBy });
      setMessage({ ok: true, text: "Viewer access disabled. Existing viewers have been signed out." });
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Something went wrong." });
    } finally {
      setPending(null);
    }
  }

  const inputCls =
    "w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-[color:var(--acn-purple)] focus:outline-none";

  return (
    <section className="mt-8 rounded-xl border border-neutral-200 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-black">Viewer access</h2>
          <p className="mt-1 max-w-prose text-sm text-neutral-600">
            Viewers sign in with this shared password and can see the bench and skills pages. They
            can&apos;t upload, use the AI assistant, see notes or open this page.
          </p>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
            status.enabled
              ? "bg-[color:var(--acn-success-50)] text-[#00766a] ring-[color:var(--acn-success)]/30"
              : "bg-neutral-100 text-neutral-600 ring-neutral-300"
          }`}
        >
          {status.enabled ? "Enabled" : "Disabled"}
        </span>
      </div>

      {status.updatedAt && (
        <p className="mt-3 text-xs text-neutral-500">
          Last changed {fmtDate(status.updatedAt)}
          {status.updatedBy ? ` by ${status.updatedBy}` : ""}
        </p>
      )}

      {message && (
        <p
          role={message.ok ? "status" : "alert"}
          className={`mt-4 rounded-lg px-3 py-2 text-sm ${
            message.ok ? "bg-[color:var(--acn-success-50)] text-[#00766a]" : "bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </p>
      )}

      <form onSubmit={onSave} className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="viewer-password" className="mb-1 block text-sm font-medium">
            {status.enabled ? "New password" : "Password"}
          </label>
          <input
            id="viewer-password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputCls}
          />
        </div>
        <div>
          <label htmlFor="viewer-password-confirm" className="mb-1 block text-sm font-medium">
            Confirm password
          </label>
          <input
            id="viewer-password-confirm"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={inputCls}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
          <button
            type="submit"
            disabled={pending !== null}
            className="inline-flex items-center gap-2 rounded-lg bg-[color:var(--acn-purple)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {pending === "save" && <Spinner label="Saving" />}
            {status.enabled ? "Change password" : "Enable viewer access"}
          </button>
          {status.enabled && (
            <button
              type="button"
              onClick={onDisable}
              disabled={pending !== null}
              className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-black transition hover:border-black disabled:opacity-50"
            >
              {pending === "disable" && <Spinner label="Disabling" />}
              Disable viewer access
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
