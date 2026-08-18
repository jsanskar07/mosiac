import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ACCESS_COOKIE } from "@/src/platform/auth/session-cookies";
import { getAuthCapabilities } from "@/src/platform/config/server";
import AuthForm from "./auth-form";

export const dynamic = "force-dynamic";

export default async function AuthPage() {
  const accessToken = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (accessToken) redirect("/");

  return <AuthForm capabilities={getAuthCapabilities()} />;
}
