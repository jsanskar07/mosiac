import { NextRequest, NextResponse } from "next/server";

import {
  centralRbacRequest,
  ServerConfigurationError,
  upstreamMessage,
} from "@/src/platform/auth/central-rbac";
import {
  ACCESS_COOKIE,
  clearAccessCookie,
} from "@/src/platform/auth/session-cookies";
import { apiError, requestId } from "@/src/platform/http/responses";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const id = requestId(request);
  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  if (!accessToken) {
    return apiError(401, "SESSION_REQUIRED", "No active session was found", id);
  }

  try {
    const identities = await centralRbacRequest("/api/v2/me/identities", {
      accessToken,
      requestId: id,
    });

    if (!identities.ok) {
      const response = apiError(
        identities.status,
        "SESSION_REJECTED",
        upstreamMessage(identities.body, "Session is invalid or expired"),
        id,
      );
      // Keep the refresh cookie so the client can renew an expired access token.
      if (identities.status === 401) clearAccessCookie(response);
      return response;
    }

    return NextResponse.json(
      { identities: identities.body?.identities ?? [] },
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
