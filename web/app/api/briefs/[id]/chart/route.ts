import { NextResponse } from "next/server"

import { mapBriefChartProxyStatus } from "@/lib/api/brief-chart"
import { BackendApiError } from "@/lib/api/client"
import { getBriefChartPng } from "@/lib/api/research"
import { hasValidSession } from "@/lib/auth/server-session"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, context: RouteContext) {
  if (!(await hasValidSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await context.params

  try {
    const png = await getBriefChartPng(id)
    return new NextResponse(new Uint8Array(png), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "private, no-store",
      },
    })
  } catch (error) {
    if (error instanceof BackendApiError) {
      const status = mapBriefChartProxyStatus(error.status)
      return NextResponse.json(
        {
          error:
            status === 404
              ? "Not found"
              : status === 401
                ? "Unauthorized"
                : "Brief chart is unavailable",
        },
        { status }
      )
    }

    return NextResponse.json(
      { error: "Brief chart is unavailable" },
      { status: 502 }
    )
  }
}
