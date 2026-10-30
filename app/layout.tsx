import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import TopNav from "@/components/TopNav";
import RouteTransition from "@/components/RouteTransition";
import { getSession } from "@/lib/auth";

const graphikFallback = Inter({
  subsets: ["latin"],
  variable: "--font-graphik",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Bench Tool · Accenture",
  description: "Resource availability dashboard",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await getSession();

  return (
    <html lang="en" className={`${graphikFallback.variable} h-full antialiased`}>
      <body className="min-h-full bg-[color:var(--acn-bg)] text-[color:var(--acn-ink)]">
        <TopNav userName={session?.name} isAdmin={session?.role === "admin"} />
        <RouteTransition>{children}</RouteTransition>
      </body>
    </html>
  );
}
