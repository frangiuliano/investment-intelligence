import { NextResponse, type NextRequest } from "next/server"

import { SESSION_COOKIE_NAME } from "@/lib/auth/session"

export async function POST(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/login", request.url), {
    status: 303,
  })
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  })

  return response
}
