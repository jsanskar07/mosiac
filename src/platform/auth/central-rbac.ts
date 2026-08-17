import {
  getCentralRbacConfig,
  ServerConfigurationError,
} from "@/src/platform/config/server";

export type CentralRbacResponse = {
  ok: boolean;
  status: number;
  body: Record<string, unknown> | null;
};

export type SessionTokens = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

type CentralRequestOptions = {
  method?: "GET" | "POST" | "DELETE";
  body?: unknown;
  accessToken?: string;
  requestId: string;
};

export async function centralRbacRequest(
  pathname: string,
  options: CentralRequestOptions,
): Promise<CentralRbacResponse> {
  const config = getCentralRbacConfig();
  const url = new URL(pathname, config.baseUrl);
  const headers = new Headers({
    accept: "application/json",
    "x-api-key": config.projectApiKey,
    "x-request-id": options.requestId,
  });

  if (options.body !== undefined) {
    headers.set("content-type", "application/json");
  }
  if (options.accessToken) {
    headers.set("authorization", `Bearer ${options.accessToken}`);
  }

  const response = await fetch(url, {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    cache: "no-store",
    redirect: "error",
  });

  return {
    ok: response.ok,
    status: response.status,
    body: await parseJson(response),
  };
}

export function readSessionTokens(
  body: Record<string, unknown> | null,
): SessionTokens | null {
  if (
    typeof body?.access_token !== "string" ||
    typeof body.refresh_token !== "string"
  ) {
    return null;
  }

  return {
    accessToken: body.access_token,
    refreshToken: body.refresh_token,
    expiresIn:
      typeof body.expires_in === "number" && body.expires_in > 0
        ? Math.min(body.expires_in, 900)
        : 900,
  };
}

export function publicAuthBody(
  body: Record<string, unknown> | null,
): Record<string, unknown> {
  if (!body) return {};
  const safe = { ...body };
  delete safe.access_token;
  delete safe.refresh_token;
  return safe;
}

export function upstreamMessage(
  body: Record<string, unknown> | null,
  fallback: string,
): string {
  if (typeof body?.error === "string") return body.error;
  return fallback;
}

export { ServerConfigurationError };

async function parseJson(
  response: Response,
): Promise<Record<string, unknown> | null> {
  if (response.status === 204) return null;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return null;

  try {
    const value: unknown = await response.json();
    return value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}
