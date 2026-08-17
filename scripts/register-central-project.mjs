const baseUrl = process.env.CENTRAL_RBAC_URL?.trim();
const adminKey = process.env.CENTRAL_RBAC_ADMIN_KEY?.trim();

if (!baseUrl || !adminKey) {
  console.error(
    "Set CENTRAL_RBAC_URL and CENTRAL_RBAC_ADMIN_KEY before registering Mosaic.",
  );
  process.exit(1);
}

const response = await fetch(new URL("/api/v1/projects", baseUrl), {
  method: "POST",
  headers: {
    accept: "application/json",
    "content-type": "application/json",
    "x-admin-key": adminKey,
  },
  body: JSON.stringify({
    name: "Mosaic",
    description: "Mosaic photo-sharing social network",
  }),
});

const body = await response.json().catch(() => ({}));
if (!response.ok) {
  console.error(
    typeof body.error === "string"
      ? body.error
      : `Central RBAC returned HTTP ${response.status}`,
  );
  process.exit(1);
}

console.log("Mosaic was registered in Central RBAC.");
console.log("Store this response in the deployment secret manager; the API key is shown once:");
console.log(JSON.stringify(body, null, 2));
