import { describe, expect, it } from "vitest"

import { parseHypothesisForm } from "./research"

function hypothesisFormData(
  overrides: Record<string, string> = {}
): FormData {
  const formData = new FormData()
  const fields: Record<string, string> = {
    symbol: "msft",
    bias: "bullish",
    thesis: "Cloud growth reaccelerates.",
    invalidation: "Two quarters of decelerating Azure revenue.",
    horizonDays: "90",
    ...overrides,
  }
  for (const [key, value] of Object.entries(fields)) {
    formData.set(key, value)
  }
  return formData
}

describe("parseHypothesisForm", () => {
  it("parses a complete hypothesis", () => {
    expect(parseHypothesisForm(hypothesisFormData())).toEqual({
      ok: true,
      value: {
        symbol: "MSFT",
        bias: "bullish",
        thesis: "Cloud growth reaccelerates.",
        invalidation: "Two quarters of decelerating Azure revenue.",
        horizonDays: 90,
      },
    })
  })

  it("requires thesis and invalidation", () => {
    expect(parseHypothesisForm(hypothesisFormData({ thesis: " " })).ok).toBe(
      false
    )
    expect(
      parseHypothesisForm(hypothesisFormData({ invalidation: "" })).ok
    ).toBe(false)
  })

  it("rejects an unknown bias", () => {
    expect(
      parseHypothesisForm(hypothesisFormData({ bias: "sideways" })).ok
    ).toBe(false)
  })

  it("rejects a fractional horizon", () => {
    expect(
      parseHypothesisForm(hypothesisFormData({ horizonDays: "1.5" })).ok
    ).toBe(false)
  })
})
