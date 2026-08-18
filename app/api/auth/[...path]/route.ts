import { NextRequest, NextResponse } from "next/server";

import {
  centralRbacRequest,
  publicAuthBody,
  readSessionTokens,
  ServerConfigurationError,
  upstreamMessage,
} from "@/src/platform/auth/central-rbac";
import {
  clearSessionCookies,
  REFRESH_COOKIE,
  setSessionCookies,
} from "@/src/platform/auth/session-cookies";
import {
  apiError,
  isSameOrigin,
  requestId,
} from "@/src/platform/http/responses";
import { getAuthCapabilities } from "@/src/platform/config/server";

const routeMap = {
  "email/register": "/api/v2/auth/email/register",
  "email/verification/request": "/api/v2/auth/email/verification/request",
  "email/verify": "/api/v2/auth/email/verify",
  "password/login": "/api/v2/auth/password/login",
  "password/recovery/request": "/api/v2/auth/password/recovery/request",
  "password/recovery/complete": "/api/v2/auth/password/recovery/complete",
  "otp/request": "/api/v2/auth/otp/request",
  "otp/verify": "/api/v2/auth/otp/verify",
  refresh: "/api/v2/auth/refresh",
  logout: "/api/v2/auth/logout",
} as const;

const sessionIssuingRoutes = new Set([
  "email/verify",
  "password/login",
  "otp/verify",
  "refresh",
]);

type RouteContext = { params: Promise<{ path: string[] }> };

export async function POST(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const id = requestId(request);
  if (!isSameOrigin(request)) {
    return apiError(403, "ORIGIN_REJECTED", "Request origin is not allowed", id);
  }

  const { path } = await context.params;
  const routeKey = path.join("/") as keyof typeof routeMap;
  const upstreamPath = routeMap[routeKey];
  if (!upstreamPath) {
    return apiError(404, "AUTH_ROUTE_NOT_FOUND", "Authentication route not found", id);
  }

  const capabilities = getAuthCapabilities();
  if (routeKey.startsWith("otp/") && !capabilities.mobileOtp) {
    return apiError(
      404,
      "AUTH_METHOD_DISABLED",
      "Mobile verification is not available",
      id,
    );
  }
  if (
    (routeKey.startsWith("email/") || routeKey.startsWith("password/recovery/")) &&
    !capabilities.emailVerification
  ) {
    return apiError(
      404,
      "AUTH_METHOD_DISABLED",
      "Email verification is not available",
      id,
    );
  }

  let body: unknown;
  if (routeKey === "refresh" || routeKey === "logout") {
    const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
    if (!refreshToken) {
      const response = apiError(
        401,
        "SESSION_REQUIRED",
        "No active session was found",
        id,
      );
      clearSessionCookies(response);
      return response;
    }
    body = { refresh_token: refreshToken };
  } else {
    try {
      body = await readJsonBody(request);
    } catch {
      return apiError(400, "INVALID_REQUEST", "A valid JSON body is required", id);
    }
  }

  try {
    const upstream = await centralRbacRequest(upstreamPath, {
      method: "POST",
      body,
      requestId: id,
    });

    if (!upstream.ok) {
      const response = apiError(
        upstream.status,
        "AUTH_REQUEST_REJECTED",
        upstreamMessage(upstream.body, "Authentication request was rejected"),
        id,
      );
      if (routeKey === "refresh" || routeKey === "logout") {
        clearSessionCookies(response);
      }
      if (upstream.status === 429 && upstream.retryAfter) {
        response.headers.set("retry-after", upstream.retryAfter);
      }
      return response;
    }

    if (routeKey === "logout") {
      const response = new NextResponse(null, {
        status: 204,
        headers: { "x-request-id": id, "cache-control": "no-store" },
      });
      clearSessionCookies(response);
      return response;
    }

    if (sessionIssuingRoutes.has(routeKey)) {
      const tokens = readSessionTokens(upstream.body);
      if (!tokens) {
        return apiError(
          502,
          "INVALID_AUTH_RESPONSE",
          "Authentication service returned an invalid response",
          id,
        );
      }
      const response = NextResponse.json(publicAuthBody(upstream.body), {
        status: upstream.status,
        headers: { "x-request-id": id, "cache-control": "no-store" },
      });
      setSessionCookies(
        request,
        response,
        tokens.accessToken,
        tokens.refreshToken,
        tokens.expiresIn,
      );
      return response;
    }

    if (upstream.status === 204) {
      return new NextResponse(null, {
        status: 204,
        headers: { "x-request-id": id, "cache-control": "no-store" },
      });
    }

    return NextResponse.json(upstream.body ?? {}, {
      status: upstream.status,
      headers: { "x-request-id": id, "cache-control": "no-store" },
    });
  } catch (error) {
    if (error instanceof ServerConfigurationError) {
      const response = apiError(503, "AUTH_NOT_CONFIGURED", error.message, id);
      if (routeKey === "logout") clearSessionCookies(response);
      return response;
    }
    const response = apiError(
      502,
      "AUTH_SERVICE_UNAVAILABLE",
      "Authentication service is temporarily unavailable",
      id,
    );
    if (routeKey === "logout") clearSessionCookies(response);
    return response;
  }
}

async function readJsonBody(request: Request): Promise<unknown> {
  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (declaredLength > 64 * 1024) throw new Error("request body too large");

  const text = await request.text();
  if (!text || text.length > 64 * 1024) throw new Error("invalid request body");
  return JSON.parse(text) as unknown;
}
