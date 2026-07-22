export function shouldShowBriefChart(
  chartAvailable: boolean | undefined
): boolean {
  return chartAvailable === true
}

export function briefChartSrc(briefId: string): string {
  return `/api/briefs/${encodeURIComponent(briefId)}/chart`
}

export function mapBriefChartProxyStatus(
  backendStatus: number
): 401 | 404 | 502 {
  if (backendStatus === 404) {
    return 404
  }
  if (backendStatus === 401 || backendStatus === 403) {
    return 401
  }
  return 502
}
