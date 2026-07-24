import { describe, expect, it } from "vitest"

import type { Hypothesis } from "@/lib/api/types"

import { findHypothesisForBrief, partitionOpenHypotheses } from "./hypotheses"

function hypothesis(
  overrides: Partial<Hypothesis> & Pick<Hypothesis, "id" | "source">
): Hypothesis {
  return {
    symbol: "AAPL",
    bias: "bullish",
    thesis: "Thesis",
    invalidation: "Invalidation",
    horizonDays: 30,
    status: "open",
    sourceRefId: null,
    closedAt: null,
    closeNote: null,
    createdAt: "2026-07-24T00:00:00.000Z",
    updatedAt: "2026-07-24T00:00:00.000Z",
    ...overrides,
  }
}

describe("partitionOpenHypotheses", () => {
  it("puts brief and alert hypotheses above manuals", () => {
    const open = [
      hypothesis({ id: "m1", source: "manual" }),
      hypothesis({
        id: "b1",
        source: "brief",
        sourceRefId: "11111111-1111-4111-8111-111111111111",
      }),
      hypothesis({ id: "a1", source: "alert", sourceRefId: "alert-1" }),
    ]

    const { fromReports, manual } = partitionOpenHypotheses(open)

    expect(fromReports.map((item) => item.id)).toEqual(["b1", "a1"])
    expect(manual.map((item) => item.id)).toEqual(["m1"])
  })
})

describe("findHypothesisForBrief", () => {
  it("returns the hypothesis linked to the brief id", () => {
    const briefId = "22222222-2222-4222-8222-222222222222"
    const linked = hypothesis({
      id: "h1",
      source: "brief",
      sourceRefId: briefId,
    })
    const other = hypothesis({
      id: "h2",
      source: "brief",
      sourceRefId: "33333333-3333-4333-8333-333333333333",
    })

    expect(findHypothesisForBrief([other, linked], briefId)).toEqual(linked)
  })

  it("returns null when no brief-linked hypothesis exists", () => {
    expect(
      findHypothesisForBrief(
        [hypothesis({ id: "m1", source: "manual" })],
        "22222222-2222-4222-8222-222222222222"
      )
    ).toBeNull()
  })
})
