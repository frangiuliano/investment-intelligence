import { describe, expect, it } from "vitest"

import {
  briefChartSrc,
  mapBriefChartProxyStatus,
  shouldShowBriefChart,
} from "./brief-chart"

describe("brief chart helpers", () => {
  it("shows the chart only when Nest reports chartAvailable", () => {
    expect(shouldShowBriefChart(true)).toBe(true)
    expect(shouldShowBriefChart(false)).toBe(false)
    expect(shouldShowBriefChart(undefined)).toBe(false)
  })

  it("builds a same-origin BFF path for the brief chart", () => {
    expect(briefChartSrc("a1b2c3d4-e5f6-7890-abcd-ef1234567890")).toBe(
      "/api/briefs/a1b2c3d4-e5f6-7890-abcd-ef1234567890/chart"
    )
  })

  it("maps Nest chart errors to BFF statuses without leaking upstream detail", () => {
    expect(mapBriefChartProxyStatus(404)).toBe(404)
    expect(mapBriefChartProxyStatus(401)).toBe(401)
    expect(mapBriefChartProxyStatus(403)).toBe(401)
    expect(mapBriefChartProxyStatus(500)).toBe(502)
  })
})
