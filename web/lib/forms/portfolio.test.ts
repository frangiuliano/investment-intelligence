import { describe, expect, it } from "vitest"

import { parseHoldingForm, parseWatchlistForm } from "./portfolio"

function holdingFormData(
  overrides: Record<string, string> = {}
): FormData {
  const formData = new FormData()
  const fields: Record<string, string> = {
    symbol: "aapl",
    assetType: "equity",
    quantity: "10",
    avgEntryPrice: "150.25",
    currency: "usd",
    notes: "core position",
    ...overrides,
  }
  for (const [key, value] of Object.entries(fields)) {
    formData.set(key, value)
  }
  return formData
}

describe("parseHoldingForm", () => {
  it("normalizes symbol and currency to uppercase", () => {
    const result = parseHoldingForm(holdingFormData())

    expect(result).toEqual({
      ok: true,
      value: {
        symbol: "AAPL",
        assetType: "equity",
        quantity: "10",
        currency: "USD",
        avgEntryPrice: "150.25",
        notes: "core position",
      },
    })
  })

  it("treats blank optional fields as null and omits blank currency", () => {
    const result = parseHoldingForm(
      holdingFormData({ avgEntryPrice: "", currency: "", notes: "" })
    )

    expect(result).toEqual({
      ok: true,
      value: {
        symbol: "AAPL",
        assetType: "equity",
        quantity: "10",
        avgEntryPrice: null,
        notes: null,
      },
    })
  })

  it("rejects an invalid asset type", () => {
    const result = parseHoldingForm(holdingFormData({ assetType: "crypto" }))

    expect(result.ok).toBe(false)
  })

  it("rejects a non-positive quantity", () => {
    const result = parseHoldingForm(holdingFormData({ quantity: "0" }))

    expect(result.ok).toBe(false)
  })

  it("rejects a malformed currency", () => {
    const result = parseHoldingForm(holdingFormData({ currency: "US" }))

    expect(result.ok).toBe(false)
  })
})

describe("parseWatchlistForm", () => {
  it("accepts a symbol with optional notes", () => {
    const formData = new FormData()
    formData.set("symbol", "nvda")

    expect(parseWatchlistForm(formData)).toEqual({
      ok: true,
      value: { symbol: "NVDA", notes: null },
    })
  })

  it("rejects a missing symbol", () => {
    expect(parseWatchlistForm(new FormData()).ok).toBe(false)
  })
})
