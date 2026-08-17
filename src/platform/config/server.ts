export class ServerConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ServerConfigurationError";
  }
}

export type CentralRbacConfig = {
  baseUrl: URL;
  projectApiKey: string;
};

export function getCentralRbacConfig(): CentralRbacConfig {
  const rawUrl = process.env.CENTRAL_RBAC_URL?.trim();
  const projectApiKey = process.env.CENTRAL_RBAC_PROJECT_API_KEY?.trim();

  if (!rawUrl || !projectApiKey) {
    throw new ServerConfigurationError(
      "Mosaic authentication is not configured",
    );
  }

  let baseUrl: URL;
  try {
    baseUrl = new URL(rawUrl);
  } catch {
    throw new ServerConfigurationError("CENTRAL_RBAC_URL is invalid");
  }

  if (!['http:', 'https:'].includes(baseUrl.protocol)) {
    throw new ServerConfigurationError("CENTRAL_RBAC_URL must use HTTP or HTTPS");
  }
  const loopback = ["localhost", "127.0.0.1", "::1"].includes(baseUrl.hostname);
  if (
    process.env.NODE_ENV === "production" &&
    baseUrl.protocol !== "https:" &&
    !loopback
  ) {
    throw new ServerConfigurationError(
      "CENTRAL_RBAC_URL must use HTTPS in production",
    );
  }

  return { baseUrl, projectApiKey };
}

export function getMosaicVersion(): string {
  return (
    process.env.MOSAIC_VERSION?.trim() ||
    process.env.CF_PAGES_COMMIT_SHA?.slice(0, 12) ||
    "development"
  );
}
