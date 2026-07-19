import "server-only"

import { cookies } from "next/headers"

import {
  SESSION_COOKIE_NAME,
  verifySessionToken,
} from "@/lib/auth/session"

export async function hasValidSession(): Promise<boolean> {
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value

  return verifySessionToken(
    sessionToken,
    process.env.DASHBOARD_SESSION_SECRET ?? ""
  )
}
