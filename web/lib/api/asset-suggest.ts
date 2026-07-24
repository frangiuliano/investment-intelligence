export const MIN_ASSET_SUGGEST_QUERY_LENGTH = 1
export const ASSET_SUGGEST_DEBOUNCE_MS = 280

export function shouldFetchAssetSuggestions(query: string): boolean {
  return query.trim().length >= MIN_ASSET_SUGGEST_QUERY_LENGTH
}

export function assetSuggestSrc(query: string): string {
  const params = new URLSearchParams({ q: query.trim() })
  return `/api/assets/suggest?${params.toString()}`
}

export function mapAssetSuggestProxyStatus(
  backendStatus: number
): 400 | 401 | 503 | 502 {
  if (backendStatus === 400) {
    return 400
  }
  if (backendStatus === 401 || backendStatus === 403) {
    return 401
  }
  if (backendStatus === 503) {
    return 503
  }
  return 502
}

/** Enter confirms a list option only when results are ready and highlighted. */
export function shouldSelectSuggestionOnEnter(
  status: "idle" | "loading" | "ready" | "empty" | "error",
  activeIndex: number,
  itemCount: number
): boolean {
  return (
    status === "ready" && activeIndex >= 0 && activeIndex < itemCount
  )
}

/**
 * Arm a one-shot fetch skip only when select will change `query`.
 * Same-symbol select does not re-run the effect, so a skip flag would stick.
 */
export function shouldSkipFetchAfterSelect(
  previousQuery: string,
  selectedSymbol: string
): boolean {
  return selectedSymbol !== previousQuery
}
