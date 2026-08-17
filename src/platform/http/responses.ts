import { NextResponse } from "next/server";

export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    request_id: string;
  };
};

export function requestId(request: Request): string {
  return request.headers.get("x-request-id")?.slice(0, 128) || crypto.randomUUID();
}

export function apiError(
  status: number,
  code: string,
  message: string,
  id: string,
): NextResponse<ApiErrorBody> {
  return NextResponse.json(
    { error: { code, message, request_id: id } },
    { status, headers: { "x-request-id": id, "cache-control": "no-store" } },
  );
}

export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}
