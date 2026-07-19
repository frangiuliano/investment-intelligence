import { describe, expect, it } from "vitest"

import {
  parseOneOf,
  parsePositiveInteger,
  parsePositiveNumber,
  parseTicker,
  readOptionalString,
  readString,
} from "./parse"

describe("readString", () => {
  it("trims string fields and ignores non-string values", () => {
    const formData = new FormData()
    formData.set("symbol", "  aapl ")

    expect(readString(formData, "symbol")).toBe("aapl")
    expect(readString(formData, "missing")).toBe("")
  })
})

describe("readOptionalString", () => {
  it("returns null for empty values", () => {
    const formData = new FormData()
    formData.set("notes", "   ")

    expect(readOptionalString(formData, "notes")).toBeNull()
  })
})

describe("parseTicker", () => {
  it("uppercases and accepts valid tickers", () => {
    expect(parseTicker("brk.b")).toEqual({ ok: true, value: "BRK.B" })
  })

  it("rejects empty and malformed tickers", () => {
    expect(parseTicker("").ok).toBe(false)
    expect(parseTicker("TOO-LONG-TICKER").ok).toBe(false)
    expect(parseTicker("BAD TICKER").ok).toBe(false)
  })
})

describe("parsePositiveNumber", () => {
  it("accepts decimal quantities", () => {
    expect(parsePositiveNumber("10.5", "Quantity")).toEqual({
      ok: true,
      value: "10.5",
    })
  })

  it("rejects zero, negatives and non-numbers", () => {
    expect(parsePositiveNumber("0", "Quantity").ok).toBe(false)
    expect(parsePositiveNumber("-1", "Quantity").ok).toBe(false)
    expect(parsePositiveNumber("abc", "Quantity").ok).toBe(false)
    expect(parsePositiveNumber("", "Quantity").ok).toBe(false)
  })
})

describe("parsePositiveInteger", () => {
  it("accepts whole numbers", () => {
    expect(parsePositiveInteger("30", "Horizon")).toEqual({
      ok: true,
      value: 30,
    })
  })

  it("rejects decimals and zero", () => {
    expect(parsePositiveInteger("1.5", "Horizon").ok).toBe(false)
    expect(parsePositiveInteger("0", "Horizon").ok).toBe(false)
  })
})

describe("parseOneOf", () => {
  it("accepts values in the allowed list", () => {
    expect(parseOneOf("bullish", ["bullish", "bearish"], "Bias")).toEqual({
      ok: true,
      value: "bullish",
    })
  })

  it("rejects values outside the allowed list", () => {
    expect(parseOneOf("sideways", ["bullish", "bearish"], "Bias").ok).toBe(
      false
    )
  })
})
