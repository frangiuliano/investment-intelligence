import { NextResponse } from "next/server"

import { getBackendHealth } from "@/lib/api/client"
import { hasValidSession } from "@/lib/auth/server-session"

export async function GET() {
  if (!(await hasValidSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    return NextResponse.json(await getBackendHealth())
  } catch {
    return NextResponse.json(
      { error: "Backend health is unavailable" },
      { status: 502 }
    )
  }
}
