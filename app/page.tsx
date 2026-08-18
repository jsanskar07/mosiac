import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import MosaicFeed from "./mosaic-feed";
import { ACCESS_COOKIE } from "@/src/platform/auth/session-cookies";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const accessToken = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (!accessToken) redirect("/auth");

  return <MosaicFeed />;
}
