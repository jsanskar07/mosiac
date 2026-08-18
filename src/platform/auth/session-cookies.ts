import type { NextRequest } from "next/server";
import type { NextResponse } from "next/server";

export const ACCESS_COOKIE = "mosaic_access";
export const REFRESH_COOKIE = "mosaic_refresh";

const refreshMaxAge = 30 * 24 * 60 * 60;

export function setSessionCookies(
  request: NextRequest,
  response: NextResponse,
  accessToken: string,
  refreshToken: string,
  accessMaxAge: number,
): void {
  const secure = isSecureRequest(request);
  response.cookies.set(ACCESS_COOKIE, accessToken, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: accessMaxAge,
  });
  response.cookies.set(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/api/auth",
    maxAge: refreshMaxAge,
  });
}

export function clearSessionCookies(response: NextResponse): void {
  clearAccessCookie(response);
  response.cookies.set(REFRESH_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/api/auth",
    maxAge: 0,
  });
}

export function clearAccessCookie(response: NextResponse): void {
  response.cookies.set(ACCESS_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

function isSecureRequest(request: NextRequest): boolean {
  const forwardedProtocol = request.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim();
  return request.nextUrl.protocol === "https:" || forwardedProtocol === "https";
}
