import { NextRequest, NextResponse } from "next/server";

import {
  centralRbacRequest,
  ServerConfigurationError,
  upstreamMessage,
} from "@/src/platform/auth/central-rbac";
import {
  ACCESS_COOKIE,
  clearSessionCookies,
} from "@/src/platform/auth/session-cookies";
import { apiError, requestId } from "@/src/platform/http/responses";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const id = requestId(request);
  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  if (!accessToken) {
    return apiError(401, "SESSION_REQUIRED", "No active session was found", id);
  }

  try {
    const [identities, sessions] = await Promise.all([
      centralRbacRequest("/api/v2/me/identities", {
        accessToken,
        requestId: id,
      }),
      centralRbacRequest("/api/v2/me/sessions", {
        accessToken,
        requestId: id,
      }),
    ]);

    if (!identities.ok || !sessions.ok) {
      const rejected = !identities.ok ? identities : sessions;
      const response = apiError(
        rejected.status,
        "SESSION_REJECTED",
        upstreamMessage(rejected.body, "Session is invalid or expired"),
        id,
      );
      if (rejected.status === 401) clearSessionCookies(response);
      return response;
    }

    return NextResponse.json(
      { identities: identities.body?.identities ?? [], sessions: sessions.body?.sessions ?? [] },
      { headers: { "x-request-id": id, "cache-control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof ServerConfigurationError) {
      return apiError(503, "AUTH_NOT_CONFIGURED", error.message, id);
    }
    return apiError(
      502,
      "AUTH_SERVICE_UNAVAILABLE",
      "Authentication service is temporarily unavailable",
      id,
    );
  }
}
