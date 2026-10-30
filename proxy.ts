import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, readToken } from "@/lib/authToken";
import { getViewerAccessState } from "@/lib/viewerAccess";

const PUBLIC_PATHS = ["/auth/", "/api/auth/"];
const ADMIN_ONLY = ["/ai", "/admin", "/api/ai", "/api/admin", "/api/upload", "/api/notes"];

function matches(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(prefix + "/");
}

function toLogin(req: NextRequest) {
  const res = NextResponse.redirect(new URL("/auth/login", req.url));
  res.cookies.set(COOKIE_NAME, "", { maxAge: 0, path: "/" });
  return res;
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await readToken(token) : null;
  if (!session) return NextResponse.redirect(new URL("/auth/login", req.url));
  if (session.role === "admin") return NextResponse.next();

  const access = await getViewerAccessState();
  if (!access.enabled || access.version !== session.viewerVersion) return toLogin(req);

  if (ADMIN_ONLY.some((p) => matches(pathname, p))) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Not available to viewers" }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
