import { describe, expect, it } from "vitest"

import {
  assetSuggestSrc,
  mapAssetSuggestProxyStatus,
  shouldFetchAssetSuggestions,
} from "./asset-suggest"

describe("asset suggest helpers", () => {
  it("requires a non-empty trimmed query before fetching", () => {
    expect(shouldFetchAssetSuggestions("")).toBe(false)
    expect(shouldFetchAssetSuggestions("   ")).toBe(false)
    expect(shouldFetchAssetSuggestions("A")).toBe(true)
    expect(shouldFetchAssetSuggestions(" Apple ")).toBe(true)
  })

  it("builds a same-origin BFF path with the query encoded", () => {
    expect(assetSuggestSrc("AAP")).toBe("/api/assets/suggest?q=AAP")
    expect(assetSuggestSrc("Apple Inc")).toBe(
      "/api/assets/suggest?q=Apple+Inc"
    )
  })

  it("maps Nest suggest errors to BFF statuses without leaking detail", () => {
    expect(mapAssetSuggestProxyStatus(400)).toBe(400)
    expect(mapAssetSuggestProxyStatus(401)).toBe(401)
    expect(mapAssetSuggestProxyStatus(403)).toBe(401)
    expect(mapAssetSuggestProxyStatus(503)).toBe(503)
    expect(mapAssetSuggestProxyStatus(500)).toBe(502)
  })
})
