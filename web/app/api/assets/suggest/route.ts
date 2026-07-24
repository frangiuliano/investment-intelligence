import { NextResponse } from "next/server"

import {
  mapAssetSuggestProxyStatus,
  shouldFetchAssetSuggestions,
} from "@/lib/api/asset-suggest"
import { BackendApiError } from "@/lib/api/client"
import { suggestAssets } from "@/lib/api/assets"
import { hasValidSession } from "@/lib/auth/server-session"

export async function GET(request: Request) {
  if (!(await hasValidSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const q = searchParams.get("q") ?? ""

  if (!shouldFetchAssetSuggestions(q)) {
    return NextResponse.json(
      { error: "Query q must be at least 1 character" },
      { status: 400 }
    )
  }

  try {
    const result = await suggestAssets(q.trim())
    return NextResponse.json(result, {
      status: 200,
      headers: {
        "Cache-Control": "private, no-store",
      },
    })
  } catch (error) {
    if (error instanceof BackendApiError) {
      const status = mapAssetSuggestProxyStatus(error.status)
      return NextResponse.json(
        {
          error:
            status === 400
              ? "Invalid query"
              : status === 401
                ? "Unauthorized"
                : status === 503
                  ? "Asset suggestions are temporarily unavailable"
                  : "Asset suggestions are unavailable",
        },
        { status }
      )
    }

    return NextResponse.json(
      { error: "Asset suggestions are unavailable" },
      { status: 502 }
    )
  }
}
