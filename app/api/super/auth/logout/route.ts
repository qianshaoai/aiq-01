import { NextResponse } from "next/server";
import { SUPER_COOKIE_NAME } from "@/lib/auth";

export async function POST() {
  const res = NextResponse.redirect(new URL("/super/login", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"));
  res.cookies.delete(SUPER_COOKIE_NAME);
  return res;
}
