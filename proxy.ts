import { NextRequest, NextResponse } from "next/server";

// Decode JWT payload without signature verification (for routing only).
// Full cryptographic verification is done in server components / layouts.
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = Buffer.from(base64, "base64").toString("utf8");
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

// Public paths that don't require authentication per portal
const PUBLIC_PATHS = {
  employee: ["/login", "/register", "/invite"],
  manager: ["/manager/login"],
  admin: ["/admin/login"],
  super: ["/super/login"],
};

// API routes that need no middleware redirect
const API_PREFIX = "/api/";
const NEXT_STATIC = ["/_next/", "/favicon.ico", "/robots.txt"];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip static assets and Next.js internals
  if (NEXT_STATIC.some((p) => pathname.startsWith(p))) return NextResponse.next();

  // Skip all API routes (they handle auth themselves)
  if (pathname.startsWith(API_PREFIX)) return NextResponse.next();

  // ── Super admin portal (/super and /super/*) ─────────────────────────────
  if (pathname === "/super" || pathname.startsWith("/super/")) {
    if (PUBLIC_PATHS.super.some((p) => pathname === p)) return NextResponse.next();

    const token = req.cookies.get("aiq_super_token")?.value;
    if (!token) {
      return NextResponse.redirect(new URL("/super/login", req.url));
    }
    const payload = decodeJwtPayload(token);
    if (!payload?.superAdminId) {
      return NextResponse.redirect(new URL("/super/login", req.url));
    }
    return NextResponse.next();
  }

  // ── Admin portal (/admin and /admin/*) ───────────────────────────────────
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    if (PUBLIC_PATHS.admin.some((p) => pathname === p)) return NextResponse.next();

    const token = req.cookies.get("aiq_token")?.value;
    if (!token) {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }
    const payload = decodeJwtPayload(token);
    if (payload?.role !== "ENTERPRISE_ADMIN") {
      const res = NextResponse.redirect(new URL("/admin/login", req.url));
      res.cookies.delete("aiq_token");
      return res;
    }
    return NextResponse.next();
  }

  // ── Manager portal (/manager and /manager/*) ─────────────────────────────
  if (pathname === "/manager" || pathname.startsWith("/manager/")) {
    if (PUBLIC_PATHS.manager.some((p) => pathname === p)) return NextResponse.next();

    const token = req.cookies.get("aiq_token")?.value;
    if (!token) {
      return NextResponse.redirect(new URL("/manager/login", req.url));
    }
    const payload = decodeJwtPayload(token);
    if (payload?.role !== "TEAM_LEADER") {
      const res = NextResponse.redirect(new URL("/manager/login", req.url));
      res.cookies.delete("aiq_token");
      return res;
    }
    return NextResponse.next();
  }

  // ── Employee portal (everything else under /) ────────────────────────────
  // Skip public employee pages
  if (PUBLIC_PATHS.employee.some((p) => pathname === p || pathname.startsWith(p + "?"))) {
    return NextResponse.next();
  }
  // Skip root redirect page
  if (pathname === "/") return NextResponse.next();

  const token = req.cookies.get("aiq_token")?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  const payload = decodeJwtPayload(token);
  if (!payload) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // If wrong role accessed employee portal, redirect to correct portal
  if (payload.role === "TEAM_LEADER") {
    return NextResponse.redirect(new URL("/manager/dashboard", req.url));
  }
  if (payload.role === "ENTERPRISE_ADMIN") {
    return NextResponse.redirect(new URL("/admin/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt).*)",
  ],
};
