import { NextResponse, type NextRequest } from "next/server"

import {
  SESSION_COOKIE_NAME,
  verifySessionToken,
} from "@/lib/auth/session"

const PUBLIC_PATHS = new Set(["/login", "/api/auth/login"])

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const sessionSecret = process.env.DASHBOARD_SESSION_SECRET ?? ""
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value
  const isAuthenticated = verifySessionToken(sessionToken, sessionSecret)

  if (pathname === "/login" && isAuthenticated) {
    return NextResponse.redirect(new URL("/holdings", request.url))
  }

  if (!PUBLIC_PATHS.has(pathname) && !isAuthenticated) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("next", pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
