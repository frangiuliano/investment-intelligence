import "server-only"

import { backendFetch } from "@/lib/api/client"
import type { AssetSuggestResult } from "@/lib/api/types"

export function suggestAssets(query: string): Promise<AssetSuggestResult> {
  const params = new URLSearchParams({ q: query })
  return backendFetch<AssetSuggestResult>(`/assets/suggest?${params.toString()}`)
}
