"use client";

import { useState, FormEvent } from "react";
import Spinner from "@/components/Spinner";

type Mode = "admin" | "viewer";

const inputCls =
  "w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-[color:var(--acn-purple)] focus:outline-none";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("viewer");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setPassword("");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(mode === "admin" ? "/api/auth/login" : "/api/auth/viewer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "admin" ? { email, password } : { password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        setLoading(false);
        return;
      }
      setSignedIn(true);
      window.location.assign("/");
    } catch {
      setError("Couldn't reach the server. Please try again.");
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="relative w-full max-w-sm overflow-hidden rounded-xl border border-neutral-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold mb-6">Sign in to Bench Tool</h1>

        <div
          role="tablist"
          aria-label="Sign-in type"
          className="mb-6 grid grid-cols-2 overflow-hidden rounded-full border border-neutral-200 bg-neutral-50 text-sm font-medium"
        >
          {(["viewer", "admin"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => switchMode(m)}
              className={`py-1.5 transition ${
                mode === m ? "bg-[color:var(--acn-purple)] text-white" : "text-neutral-700 hover:text-black"
              }`}
            >
              {m === "viewer" ? "Viewer" : "Admin"}
            </button>
          ))}
        </div>

        {error && (
          <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "admin" && (
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium">
                Accenture email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputCls}
                placeholder="jane.smith@accenture.com"
              />
            </div>
          )}
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium">
              {mode === "admin" ? "Password" : "Viewer password"}
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputCls}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[color:var(--acn-purple)] py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Spinner label="Signing in" />
                Signing in…
              </>
            ) : (
              "Sign in"
            )}
          </button>
        </form>

        {signedIn && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/90 backdrop-blur-sm">
            <Spinner className="h-6 w-6 text-[color:var(--acn-purple)]" label="Signing you in" />
            <p className="text-sm font-medium text-black">Signing you in…</p>
          </div>
        )}
      </div>
    </main>
  );
}
