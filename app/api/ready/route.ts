import { NextResponse } from "next/server";

import {
  getCentralRbacConfig,
  ServerConfigurationError,
} from "@/src/platform/config/server";
import { requestId } from "@/src/platform/http/responses";

export async function GET(request: Request): Promise<NextResponse> {
  const id = requestId(request);
  try {
    const config = getCentralRbacConfig();
    const response = await fetch(new URL("/readyz", config.baseUrl), {
      headers: { "x-request-id": id },
      cache: "no-store",
      signal: AbortSignal.timeout(2_000),
    });
    if (!response.ok) throw new Error("Central RBAC is not ready");

    return NextResponse.json(
      { status: "ready", dependencies: { identity: "ready" } },
      { headers: { "x-request-id": id, "cache-control": "no-store" } },
    );
  } catch (error) {
    const reason =
      error instanceof ServerConfigurationError ? "not_configured" : "unavailable";
    return NextResponse.json(
      { status: "not_ready", dependencies: { identity: reason } },
      {
        status: 503,
        headers: { "x-request-id": id, "cache-control": "no-store" },
      },
    );
  }
}
