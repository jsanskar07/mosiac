import { NextResponse } from "next/server";

import { getAuthCapabilities } from "@/src/platform/config/server";

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(getAuthCapabilities(), {
    headers: { "cache-control": "no-store" },
  });
}
