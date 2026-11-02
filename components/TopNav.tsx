"use client";

import { useState } from "react";
import Link, { useLinkStatus } from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import Spinner from "@/components/Spinner";

const NAV_ITEMS = [
  { href: "/", label: "Bench", match: (p: string) => p === "/", adminOnly: false, keepsBu: true },
  { href: "/skills", label: "Skills", match: (p: string) => p.startsWith("/skills"), adminOnly: false, keepsBu: true },
  { href: "/ai", label: "AI Assistant", match: (p: string) => p.startsWith("/ai"), adminOnly: true, keepsBu: false },
  { href: "/admin", label: "Admin", match: (p: string) => p.startsWith("/admin"), adminOnly: true, keepsBu: false },
] as const;

export default function TopNav({
  userName,
  isAdmin,
}: {
  userName?: string;
  isAdmin: boolean;
}) {
  const pathname = usePathname() ?? "/";
  const bu = useSearchParams().get("bu");
  const items = NAV_ITEMS.filter((item) => isAdmin || !item.adminOnly);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const activeIndex = Math.max(
    0,
    items.findIndex((item) => item.match(pathname)),
  );

  async function handleSignOut() {
    setSignOutError(null);
    setSigningOut(true);
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (!res.ok) throw new Error(String(res.status));
      window.location.assign("/auth/login");
    } catch {
      setSignOutError("Couldn't sign out. Try again.");
      setSigningOut(false);
    }
  }

  return (
    <header className="sticky top-0 z-20 border-b border-neutral-200 bg-black text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-90">
          <span className="text-xl font-semibold tracking-tight">Bench Tool</span>
          <span className="text-2xl font-bold leading-none text-[color:var(--acn-purple)]">
            ›
          </span>
          <span className="hidden text-xs uppercase tracking-[0.18em] text-white/60 sm:inline">
            Accenture
          </span>
        </Link>

        <nav
          aria-label="Primary"
          className="relative flex items-center rounded-full bg-white/5 p-1 ring-1 ring-white/10"
        >
          <span
            aria-hidden="true"
            className="absolute left-1 top-1 bottom-1 w-28 rounded-full bg-[color:var(--acn-purple)] shadow-[0_0_0_1px_rgba(255,255,255,0.05)] transition-transform duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{ transform: `translateX(${activeIndex * 100}%)` }}
          />
          {items.map((item, i) => (
            <PillLink
              key={item.href}
              href={bu && item.keepsBu ? `${item.href}?bu=${encodeURIComponent(bu)}` : item.href}
              active={i === activeIndex}
            >
              {item.label}
            </PillLink>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {userName && (
            <span className="hidden text-xs text-white/50 sm:inline">{userName}</span>
          )}
          {signOutError && (
            <span role="alert" className="text-xs text-rose-300">
              {signOutError}
            </span>
          )}
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="inline-flex items-center gap-1.5 text-sm text-white/50 transition-colors hover:text-white disabled:cursor-not-allowed disabled:text-white/70"
          >
            {signingOut ? (
              <>
                <Spinner label="Signing out" />
                Signing out…
              </>
            ) : (
              "Sign out"
            )}
          </button>
        </div>
      </div>
    </header>
  );
}

function PillLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`relative z-10 inline-flex h-7 w-28 items-center justify-center rounded-full text-xs font-medium transition-colors duration-200 ${
        active ? "text-white" : "text-white/70 hover:text-white"
      }`}
    >
      {children}
      <NavPending />
    </Link>
  );
}

function NavPending() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return (
    <span className="absolute right-2.5">
      <Spinner className="h-3 w-3" label="Loading page" />
    </span>
  );
}
