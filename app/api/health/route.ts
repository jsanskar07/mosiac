import { NextResponse } from "next/server";

import { getMosaicVersion } from "@/src/platform/config/server";

export function GET(): NextResponse {
  return NextResponse.json(
    { status: "ok", service: "mosaic-web", version: getMosaicVersion() },
    { headers: { "cache-control": "no-store" } },
  );
}
