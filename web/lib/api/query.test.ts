import { describe, expect, it } from "vitest"

import { buildListPath, parsePageParam, totalPages } from "./query"

describe("buildListPath", () => {
  it("returns the base path when there are no params", () => {
    expect(buildListPath("/briefs", {})).toBe("/briefs")
  })

  it("omits page 1 so the default listing has a clean URL", () => {
    expect(buildListPath("/briefs", { page: 1 })).toBe("/briefs")
  })

  it("serializes page, ticker and date range", () => {
    expect(
      buildListPath("/notifications", {
        page: 3,
        ticker: "AAPL",
        from: "2026-07-01",
        to: "2026-07-31",
      })
    ).toBe("/notifications?page=3&ticker=AAPL&from=2026-07-01&to=2026-07-31")
  })
})

describe("parsePageParam", () => {
  it("parses a valid page number", () => {
    expect(parsePageParam("4")).toBe(4)
  })

  it("falls back to 1 for missing or invalid values", () => {
    expect(parsePageParam(undefined)).toBe(1)
    expect(parsePageParam("0")).toBe(1)
    expect(parsePageParam("-2")).toBe(1)
    expect(parsePageParam("abc")).toBe(1)
    expect(parsePageParam("1.5")).toBe(1)
  })
})

describe("totalPages", () => {
  it("rounds up partial pages", () => {
    expect(totalPages(41, 20)).toBe(3)
  })

  it("never reports fewer than one page", () => {
    expect(totalPages(0, 20)).toBe(1)
  })
})
