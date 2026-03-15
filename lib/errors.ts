import { NextResponse } from "next/server";

export function apiError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function apiUnauthorized() {
  return apiError("未登录或登录已过期", 401);
}

export function apiForbidden() {
  return apiError("无权限执行此操作", 403);
}
