"use client";

import { usePathname } from "next/navigation";

/**
 * Wraps page content and re-mounts on every pathname change so the CSS
 * enter animation (`acn-route-in`) replays. The persistent TopNav in the
 * root layout sits outside this wrapper, so the pill keeps sliding even
 * while the body content cross-fades.
 */
export default function RouteTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="acn-route-in">
      {children}
    </div>
  );
}
