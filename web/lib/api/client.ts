import "server-only"

type BackendHealth = {
  status: string
  database?: string
}

export type BackendHealthResult = {
  httpStatus: number
  body: BackendHealth
}

function getApiConfig() {
  const baseUrl = process.env.API_BASE_URL
  const apiKey = process.env.DASHBOARD_API_KEY

  if (!baseUrl || !apiKey) {
    throw new Error("Dashboard API configuration is incomplete")
  }

  return {
    baseUrl: new URL(baseUrl),
    apiKey,
  }
}

// Nest replies 503 with a JSON body when the database is down; that is a
// valid health payload, not a transport failure, so status and body are
// forwarded as-is. Only network/config errors should throw.
export async function getBackendHealth(): Promise<BackendHealthResult> {
  const { baseUrl, apiKey } = getApiConfig()
  const healthUrl = new URL("/health", baseUrl)
  const response = await fetch(healthUrl, {
    headers: {
      "x-dashboard-api-key": apiKey,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(5_000),
  })

  return {
    httpStatus: response.status,
    body: (await response.json()) as BackendHealth,
  }
}
