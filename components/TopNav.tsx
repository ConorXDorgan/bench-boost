"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Bench", match: (p: string) => p === "/" },
  { href: "/skills", label: "Skills", match: (p: string) => p.startsWith("/skills") },
  { href: "/ai", label: "AI Assistant", match: (p: string) => p.startsWith("/ai") },
] as const;

export default function TopNav({ userName }: { userName?: string }) {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const activeIndex = Math.max(
    0,
    NAV_ITEMS.findIndex((item) => item.match(pathname)),
  );

  async function handleSignOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/auth/login");
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
          {NAV_ITEMS.map((item, i) => (
            <PillLink key={item.href} href={item.href} active={i === activeIndex}>
              {item.label}
            </PillLink>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {userName && (
            <span className="hidden text-xs text-white/50 sm:inline">{userName}</span>
          )}
          <button
            onClick={handleSignOut}
            className="text-sm text-white/50 hover:text-white transition-colors"
          >
            Sign out
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
    </Link>
  );
}
