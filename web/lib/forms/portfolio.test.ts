import { describe, expect, it } from "vitest"

import {
  deriveQuantityFromInvestedAmount,
  estimateAcquisitionCost,
  formatAcquisitionCostDisplay,
  formatDerivedQuantity,
  parseHoldingForm,
  parseWatchlistForm,
} from "./portfolio"

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
    if (value === "__omit__") {
      continue
    }
    formData.set(key, value)
  }
  return formData
}

describe("formatDerivedQuantity", () => {
  it("trims trailing zeros from fixed precision", () => {
    expect(formatDerivedQuantity(5)).toBe("5")
    expect(formatDerivedQuantity(5.12)).toBe("5.12")
    expect(formatDerivedQuantity(0.5)).toBe("0.5")
  })

  it("returns empty string for non-positive values", () => {
    expect(formatDerivedQuantity(0)).toBe("")
    expect(formatDerivedQuantity(-1)).toBe("")
  })
})

describe("deriveQuantityFromInvestedAmount", () => {
  it("derives units from invested amount and entry price", () => {
    expect(deriveQuantityFromInvestedAmount("1000", "200")).toEqual({
      ok: true,
      value: "5",
    })
  })

  it("rejects invested amount without a positive entry price", () => {
    expect(deriveQuantityFromInvestedAmount("1000", "").ok).toBe(false)
    expect(deriveQuantityFromInvestedAmount("1000", "0").ok).toBe(false)
    const missingPrice = deriveQuantityFromInvestedAmount("1000", "")
    expect(missingPrice.ok).toBe(false)
    if (!missingPrice.ok) {
      expect(missingPrice.error).toMatch(/precio promedio de entrada/i)
    }
  })

  it("rejects a non-positive invested amount", () => {
    expect(deriveQuantityFromInvestedAmount("0", "200").ok).toBe(false)
    expect(deriveQuantityFromInvestedAmount("", "200").ok).toBe(false)
  })
})

describe("estimateAcquisitionCost", () => {
  it("multiplies quantity by entry price when both are present", () => {
    expect(estimateAcquisitionCost("12.5", "200")).toBe(2500)
  })

  it("returns null when data is incomplete", () => {
    expect(estimateAcquisitionCost("10", null)).toBeNull()
    expect(estimateAcquisitionCost("", "10")).toBeNull()
  })
})

describe("formatAcquisitionCostDisplay", () => {
  it("formats estimated cost for display", () => {
    expect(formatAcquisitionCostDisplay(2500)).toBe("2500")
    expect(formatAcquisitionCostDisplay(12.5)).toBe("12.5")
  })
})

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

  it("accepts fractional unit quantities", () => {
    const result = parseHoldingForm(holdingFormData({ quantity: "12.5" }))

    expect(result).toEqual({
      ok: true,
      value: expect.objectContaining({
        quantity: "12.5",
      }),
    })
  })

  it("derives quantity from invested amount mode", () => {
    const result = parseHoldingForm(
      holdingFormData({
        quantityMode: "investedAmount",
        investedAmount: "1000",
        avgEntryPrice: "200",
        quantity: "__omit__",
      })
    )

    expect(result).toEqual({
      ok: true,
      value: {
        symbol: "AAPL",
        assetType: "equity",
        quantity: "5",
        currency: "USD",
        avgEntryPrice: "200",
        notes: "core position",
      },
    })
  })

  it("rejects invested amount mode without entry price", () => {
    const result = parseHoldingForm(
      holdingFormData({
        quantityMode: "investedAmount",
        investedAmount: "1000",
        avgEntryPrice: "",
        quantity: "__omit__",
      })
    )

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toMatch(/precio promedio de entrada/i)
    }
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
