import "server-only"

type BackendHealth = {
  status: string
  database?: string
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

export async function getBackendHealth(): Promise<BackendHealth> {
  const { baseUrl, apiKey } = getApiConfig()
  const healthUrl = new URL("/health", baseUrl)
  const response = await fetch(healthUrl, {
    headers: {
      "x-dashboard-api-key": apiKey,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(5_000),
  })

  if (!response.ok) {
    throw new Error(`Backend health request failed with ${response.status}`)
  }

  return response.json() as Promise<BackendHealth>
}
