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

test("renders the Mosaic home experience", async () => {
  const response = await request("/", { headers: { accept: "text/html" } });
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Mosaic — Share a life in color/i);
  assert.match(html, /Your feed/i);
  assert.match(html, /Sign in to Mosaic/i);
  assert.doesNotMatch(html, /Your site is taking shape|codex-preview/i);
});

test("renders email and mobile authentication choices", async () => {
  const response = await request("/auth", { headers: { accept: "text/html" } });
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Create your account|Welcome back/i);
  assert.match(html, /Email/i);
  assert.match(html, /Mobile/i);
  assert.match(html, /Keep the moments that make life yours/i);
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
