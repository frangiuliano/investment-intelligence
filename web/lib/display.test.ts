import { describe, expect, it } from "vitest"

import {
  formatDateTime,
  formatReturnPct,
  outcomeLabel,
  sentimentTone,
  stanceTone,
} from "./display"

describe("stanceTone", () => {
  it("maps entry stances to a positive tone", () => {
    expect(stanceTone("enter")).toBe("positive")
    expect(stanceTone("add")).toBe("positive")
  })

  it("maps exit to negative and reduce/avoid to caution", () => {
    expect(stanceTone("exit")).toBe("negative")
    expect(stanceTone("reduce")).toBe("caution")
    expect(stanceTone("avoid")).toBe("caution")
  })
})

describe("outcomeLabel", () => {
  it("translates outcome codes to readable labels", () => {
    expect(outcomeLabel("thesis_confirmed")).toBe("Thesis confirmed")
    expect(outcomeLabel("timing_issue")).toBe("Timing issue")
  })
})

describe("sentimentTone", () => {
  it("detects positive and negative sentiments regardless of casing", () => {
    expect(sentimentTone("Positive")).toBe("positive")
    expect(sentimentTone("NEGATIVE")).toBe("negative")
    expect(sentimentTone("neutral")).toBe("neutral")
  })
})

describe("formatReturnPct", () => {
  it("prefixes gains with a plus sign", () => {
    expect(formatReturnPct(3.456)).toBe("+3.46%")
    expect(formatReturnPct(-2.1)).toBe("-2.10%")
  })

  it("renders a dash when the value is unavailable", () => {
    expect(formatReturnPct(null)).toBe("—")
  })
})

describe("formatDateTime", () => {
  it("renders UTC timestamps and dashes for missing values", () => {
    expect(formatDateTime("2026-07-18T12:30:00.000Z")).toContain("2026")
    expect(formatDateTime(null)).toBe("—")
    expect(formatDateTime("not-a-date")).toBe("—")
  })
})
