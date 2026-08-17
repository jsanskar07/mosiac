import { NextResponse } from "next/server";

import { getMosaicVersion } from "@/src/platform/config/server";

export function GET(): NextResponse {
  return NextResponse.json(
    { service: "mosaic-web", version: getMosaicVersion() },
    { headers: { "cache-control": "public, max-age=60" } },
  );
}
