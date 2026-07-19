import { NextResponse, type NextRequest } from "next/server"

import { verifyDashboardPassword } from "@/lib/auth/password"
import {
  createSessionToken,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
} from "@/lib/auth/session"

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const password = formData.get("password")
  const sessionSecret = process.env.DASHBOARD_SESSION_SECRET

  if (
    typeof password !== "string" ||
    !sessionSecret ||
    !verifyDashboardPassword(password)
  ) {
    return NextResponse.redirect(new URL("/login?error=invalid", request.url), {
      status: 303,
    })
  }

  const response = NextResponse.redirect(new URL("/holdings", request.url), {
    status: 303,
  })
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: createSessionToken(sessionSecret),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  })

  return response
}
