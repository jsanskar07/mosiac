import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";

async function request(pathname, init) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${Math.random()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${pathname}`, init),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("redirects signed-out visitors to authentication", async () => {
  const response = await request("/", { headers: { accept: "text/html" } });
  assert.equal(response.status, 307);
  assert.equal(new URL(response.headers.get("location"), "http://localhost").pathname, "/auth");
});

test("renders the Mosaic feed for an authenticated visitor", async () => {
  const response = await request("/", {
    headers: {
      accept: "text/html",
      cookie: "mosaic_access=access-secret",
    },
  });
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Mosaic — Share a life in color/i);
  assert.match(html, /Your feed/i);
  assert.match(html, /Welcome back/i);
  assert.match(html, /loading="lazy"/i);
  assert.match(html, /Mosaic member/i);
  assert.match(html, /Discover/i);
  assert.match(html, /Messages/i);
  assert.match(html, /Activity/i);
  assert.match(html, /Profile/i);
  assert.doesNotMatch(html, /Amelia Stone/i);
  assert.doesNotMatch(html, /Sunday, August 16/i);
  assert.doesNotMatch(html, /Sign in to Mosaic|codex-preview/i);
});

test("renders enabled email flows and marks mobile OTP unavailable", async () => {
  const response = await request("/auth", { headers: { accept: "text/html" } });
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Create your account|Welcome back/i);
  assert.match(html, /Email/i);
  assert.match(html, /Mobile/i);
  assert.match(html, /Unavailable/i);
  assert.match(html, /Forgot your password/i);
  assert.match(html, /Keep the moments that make life yours/i);
});

test("publishes safe authentication capabilities", async () => {
  const response = await request("/api/auth/capabilities", {
    headers: { accept: "application/json" },
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    emailPassword: true,
    emailVerification: true,
    passwordRecovery: true,
    mobileOtp: false,
  });
  assert.equal(response.headers.get("cache-control"), "no-store");
});

test("rejects disabled mobile OTP without contacting Central RBAC", async () => {
  const response = await request("/api/auth/otp/request", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      origin: "http://localhost",
    },
    body: JSON.stringify({ mobile: "+919876543210", purpose: "login" }),
  });
  assert.equal(response.status, 404);
  const body = await response.json();
  assert.equal(body.error.code, "AUTH_METHOD_DISABLED");
});

test("redirects authenticated visitors away from authentication", async () => {
  const response = await request("/auth", {
    headers: {
      accept: "text/html",
      cookie: "mosaic_access=access-secret",
    },
  });
  assert.equal(response.status, 307);
  assert.equal(new URL(response.headers.get("location"), "http://localhost").pathname, "/");
});

test("exposes a versioned health response", async () => {
  const response = await request("/api/health", {
    headers: { accept: "application/json" },
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    status: "ok",
    service: "mosaic-web",
    version: "development",
  });
  assert.equal(response.headers.get("cache-control"), "no-store");
});

test("fails closed when authentication is not configured", async () => {
  const response = await request("/api/auth/password/login", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      origin: "http://localhost",
    },
    body: JSON.stringify({ email: "person@example.com", password: "not-a-secret" }),
  });
  assert.equal(response.status, 503);
  const body = await response.json();
  assert.equal(body.error.code, "AUTH_NOT_CONFIGURED");
  assert.ok(body.error.request_id);
});

test("rejects cross-origin authentication mutations", async () => {
  const response = await request("/api/auth/password/login", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      origin: "https://attacker.example",
    },
    body: JSON.stringify({ email: "person@example.com", password: "not-a-secret" }),
  });
  assert.equal(response.status, 403);
  const body = await response.json();
  assert.equal(body.error.code, "ORIGIN_REJECTED");
});

test("moves Central RBAC session tokens into HTTP-only cookies", async () => {
  const server = createServer((incoming, outgoing) => {
    assert.equal(incoming.url, "/api/v2/auth/password/login");
    assert.equal(incoming.headers["x-api-key"], "mosaic-test-key");
    outgoing.writeHead(200, { "content-type": "application/json" });
    outgoing.end(
      JSON.stringify({
        access_token: "access-secret",
        refresh_token: "refresh-secret",
        token_type: "Bearer",
        expires_in: 900,
        user_id: 42,
      }),
    );
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address === "object");

  const previousUrl = process.env.CENTRAL_RBAC_URL;
  const previousKey = process.env.CENTRAL_RBAC_PROJECT_API_KEY;
  process.env.CENTRAL_RBAC_URL = `http://127.0.0.1:${address.port}`;
  process.env.CENTRAL_RBAC_PROJECT_API_KEY = "mosaic-test-key";

  try {
    const response = await request("/api/auth/password/login", {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        origin: "http://localhost",
      },
      body: JSON.stringify({
        email: "person@example.com",
        password: "a-secure-password",
      }),
    });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.user_id, 42);
    assert.equal(body.access_token, undefined);
    assert.equal(body.refresh_token, undefined);

    const cookies = response.headers.get("set-cookie") ?? "";
    assert.match(cookies, /mosaic_access=access-secret/i);
    assert.match(cookies, /mosaic_refresh=refresh-secret/i);
    assert.match(cookies, /HttpOnly/i);
    assert.doesNotMatch(cookies, /; Secure/i);

    const feed = await request("/", {
      headers: {
        accept: "text/html",
        cookie: "mosaic_access=access-secret",
      },
    });
    assert.equal(feed.status, 200);
    assert.match(await feed.text(), /Your feed/i);
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
    if (previousUrl === undefined) delete process.env.CENTRAL_RBAC_URL;
    else process.env.CENTRAL_RBAC_URL = previousUrl;
    if (previousKey === undefined) delete process.env.CENTRAL_RBAC_PROJECT_API_KEY;
    else process.env.CENTRAL_RBAC_PROJECT_API_KEY = previousKey;
  }
});

test("preserves the refresh cookie when an access token expires", async () => {
  const server = createServer((incoming, outgoing) => {
    assert.equal(incoming.url, "/api/v2/me/identities");
    assert.equal(incoming.headers.authorization, "Bearer expired-access");
    outgoing.writeHead(401, { "content-type": "application/json" });
    outgoing.end(JSON.stringify({ error: "Access token expired" }));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address === "object");

  const previousUrl = process.env.CENTRAL_RBAC_URL;
  const previousKey = process.env.CENTRAL_RBAC_PROJECT_API_KEY;
  process.env.CENTRAL_RBAC_URL = `http://127.0.0.1:${address.port}`;
  process.env.CENTRAL_RBAC_PROJECT_API_KEY = "mosaic-test-key";

  try {
    const response = await request("/api/auth/session", {
      headers: {
        accept: "application/json",
        cookie: "mosaic_access=expired-access; mosaic_refresh=still-valid",
      },
    });
    assert.equal(response.status, 401);
    const cookies = response.headers.get("set-cookie") ?? "";
    assert.match(cookies, /mosaic_access=/i);
    assert.doesNotMatch(cookies, /mosaic_refresh=/i);
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
    if (previousUrl === undefined) delete process.env.CENTRAL_RBAC_URL;
    else process.env.CENTRAL_RBAC_URL = previousUrl;
    if (previousKey === undefined) delete process.env.CENTRAL_RBAC_PROJECT_API_KEY;
    else process.env.CENTRAL_RBAC_PROJECT_API_KEY = previousKey;
  }
});

test("rotates both session cookies without exposing Central RBAC tokens", async () => {
  const server = createServer((incoming, outgoing) => {
    assert.equal(incoming.url, "/api/v2/auth/refresh");
    let rawBody = "";
    incoming.setEncoding("utf8");
    incoming.on("data", (chunk) => { rawBody += chunk; });
    incoming.on("end", () => {
      assert.deepEqual(JSON.parse(rawBody), { refresh_token: "old-refresh" });
      outgoing.writeHead(200, { "content-type": "application/json" });
      outgoing.end(JSON.stringify({
        access_token: "new-access",
        refresh_token: "new-refresh",
        expires_in: 900,
      }));
    });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address === "object");

  const previousUrl = process.env.CENTRAL_RBAC_URL;
  const previousKey = process.env.CENTRAL_RBAC_PROJECT_API_KEY;
  process.env.CENTRAL_RBAC_URL = `http://127.0.0.1:${address.port}`;
  process.env.CENTRAL_RBAC_PROJECT_API_KEY = "mosaic-test-key";

  try {
    const response = await request("/api/auth/refresh", {
      method: "POST",
      headers: {
        accept: "application/json",
        origin: "http://localhost",
        cookie: "mosaic_refresh=old-refresh",
      },
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { expires_in: 900 });
    const cookies = response.headers.get("set-cookie") ?? "";
    assert.match(cookies, /mosaic_access=new-access/i);
    assert.match(cookies, /mosaic_refresh=new-refresh/i);
    assert.doesNotMatch(cookies, /old-refresh/i);
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
    if (previousUrl === undefined) delete process.env.CENTRAL_RBAC_URL;
    else process.env.CENTRAL_RBAC_URL = previousUrl;
    if (previousKey === undefined) delete process.env.CENTRAL_RBAC_PROJECT_API_KEY;
    else process.env.CENTRAL_RBAC_PROJECT_API_KEY = previousKey;
  }
});

test("rejects malformed successful authentication responses", async () => {
  const server = createServer((_incoming, outgoing) => {
    outgoing.writeHead(200, { "content-type": "application/json" });
    outgoing.end(JSON.stringify({ user_id: 42 }));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address === "object");

  const previousUrl = process.env.CENTRAL_RBAC_URL;
  const previousKey = process.env.CENTRAL_RBAC_PROJECT_API_KEY;
  process.env.CENTRAL_RBAC_URL = `http://127.0.0.1:${address.port}`;
  process.env.CENTRAL_RBAC_PROJECT_API_KEY = "mosaic-test-key";

  try {
    const response = await request("/api/auth/password/login", {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        origin: "http://localhost",
      },
      body: JSON.stringify({ email: "person@example.com", password: "password" }),
    });
    assert.equal(response.status, 502);
    assert.equal((await response.json()).error.code, "INVALID_AUTH_RESPONSE");
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
    if (previousUrl === undefined) delete process.env.CENTRAL_RBAC_URL;
    else process.env.CENTRAL_RBAC_URL = previousUrl;
    if (previousKey === undefined) delete process.env.CENTRAL_RBAC_PROJECT_API_KEY;
    else process.env.CENTRAL_RBAC_PROJECT_API_KEY = previousKey;
  }
});

test("preserves Retry-After from Central RBAC rate limits", async () => {
  const server = createServer((_incoming, outgoing) => {
    outgoing.writeHead(429, {
      "content-type": "application/json",
      "retry-after": "30",
    });
    outgoing.end(JSON.stringify({ error: "Too many attempts" }));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address === "object");

  const previousUrl = process.env.CENTRAL_RBAC_URL;
  const previousKey = process.env.CENTRAL_RBAC_PROJECT_API_KEY;
  process.env.CENTRAL_RBAC_URL = `http://127.0.0.1:${address.port}`;
  process.env.CENTRAL_RBAC_PROJECT_API_KEY = "mosaic-test-key";

  try {
    const response = await request("/api/auth/password/login", {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        origin: "http://localhost",
      },
      body: JSON.stringify({ email: "person@example.com", password: "password" }),
    });
    assert.equal(response.status, 429);
    assert.equal(response.headers.get("retry-after"), "30");
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
    if (previousUrl === undefined) delete process.env.CENTRAL_RBAC_URL;
    else process.env.CENTRAL_RBAC_URL = previousUrl;
    if (previousKey === undefined) delete process.env.CENTRAL_RBAC_PROJECT_API_KEY;
    else process.env.CENTRAL_RBAC_PROJECT_API_KEY = previousKey;
  }
});

test("clears local cookies when logout cannot reach Central RBAC", async () => {
  const previousUrl = process.env.CENTRAL_RBAC_URL;
  const previousKey = process.env.CENTRAL_RBAC_PROJECT_API_KEY;
  delete process.env.CENTRAL_RBAC_URL;
  delete process.env.CENTRAL_RBAC_PROJECT_API_KEY;

  try {
    const response = await request("/api/auth/logout", {
      method: "POST",
      headers: {
        accept: "application/json",
        origin: "http://localhost",
        cookie: "mosaic_refresh=refresh-secret; mosaic_access=access-secret",
      },
    });
    assert.equal(response.status, 503);
    const cookies = response.headers.get("set-cookie") ?? "";
    assert.match(cookies, /mosaic_access=/i);
    assert.match(cookies, /mosaic_refresh=/i);
    assert.doesNotMatch(cookies, /access-secret|refresh-secret/i);
  } finally {
    if (previousUrl === undefined) delete process.env.CENTRAL_RBAC_URL;
    else process.env.CENTRAL_RBAC_URL = previousUrl;
    if (previousKey === undefined) delete process.env.CENTRAL_RBAC_PROJECT_API_KEY;
    else process.env.CENTRAL_RBAC_PROJECT_API_KEY = previousKey;
  }
});

test("returns a stable error when Central RBAC is unavailable", async () => {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address === "object");
  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );

  const previousUrl = process.env.CENTRAL_RBAC_URL;
  const previousKey = process.env.CENTRAL_RBAC_PROJECT_API_KEY;
  process.env.CENTRAL_RBAC_URL = `http://127.0.0.1:${address.port}`;
  process.env.CENTRAL_RBAC_PROJECT_API_KEY = "mosaic-test-key";

  try {
    const response = await request("/api/auth/password/login", {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        origin: "http://localhost",
      },
      body: JSON.stringify({ email: "person@example.com", password: "password" }),
    });
    assert.equal(response.status, 502);
    assert.equal((await response.json()).error.code, "AUTH_SERVICE_UNAVAILABLE");
  } finally {
    if (previousUrl === undefined) delete process.env.CENTRAL_RBAC_URL;
    else process.env.CENTRAL_RBAC_URL = previousUrl;
    if (previousKey === undefined) delete process.env.CENTRAL_RBAC_PROJECT_API_KEY;
    else process.env.CENTRAL_RBAC_PROJECT_API_KEY = previousKey;
  }
});

test("preserves Central RBAC verification-required failures", async () => {
  const server = createServer((_incoming, outgoing) => {
    outgoing.writeHead(403, { "content-type": "application/json" });
    outgoing.end(JSON.stringify({ error: "Email verification required" }));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address === "object");

  const previousUrl = process.env.CENTRAL_RBAC_URL;
  const previousKey = process.env.CENTRAL_RBAC_PROJECT_API_KEY;
  process.env.CENTRAL_RBAC_URL = `http://127.0.0.1:${address.port}`;
  process.env.CENTRAL_RBAC_PROJECT_API_KEY = "mosaic-test-key";

  try {
    const response = await request("/api/auth/password/login", {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        origin: "http://localhost",
      },
      body: JSON.stringify({ email: "person@example.com", password: "password" }),
    });
    assert.equal(response.status, 403);
    const body = await response.json();
    assert.equal(body.error.code, "AUTH_REQUEST_REJECTED");
    assert.equal(body.error.message, "Email verification required");
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
    if (previousUrl === undefined) delete process.env.CENTRAL_RBAC_URL;
    else process.env.CENTRAL_RBAC_URL = previousUrl;
    if (previousKey === undefined) delete process.env.CENTRAL_RBAC_PROJECT_API_KEY;
    else process.env.CENTRAL_RBAC_PROJECT_API_KEY = previousKey;
  }
});
