import "server-only"

type BackendHealth = {
  status: string
  database?: string
}

export type BackendHealthResult = {
  httpStatus: number
  body: BackendHealth
}

export class BackendApiError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message)
    this.name = "BackendApiError"
  }
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

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string | string[] }
    if (Array.isArray(body.message)) {
      return body.message.join(", ")
    }
    if (typeof body.message === "string" && body.message.length > 0) {
      return body.message
    }
  } catch {
    // Non-JSON error bodies fall through to the generic message.
  }
  return `Backend request failed with status ${response.status}`
}

type BackendRequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE"
  body?: unknown
  timeoutMs?: number
}

export async function backendFetch<T>(
  path: string,
  options: BackendRequestOptions = {}
): Promise<T> {
  const { baseUrl, apiKey } = getApiConfig()
  const url = new URL(path, baseUrl)
  const { method = "GET", body, timeoutMs = 15_000 } = options

  const response = await fetch(url, {
    method,
    headers: {
      "x-dashboard-api-key": apiKey,
      ...(body !== undefined ? { "content-type": "application/json" } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs),
  })

  if (!response.ok) {
    throw new BackendApiError(
      response.status,
      await readErrorMessage(response)
    )
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

export async function backendFetchBinary(
  path: string,
  options: { timeoutMs?: number } = {}
): Promise<Buffer> {
  const { baseUrl, apiKey } = getApiConfig()
  const url = new URL(path, baseUrl)
  const { timeoutMs = 15_000 } = options

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "x-dashboard-api-key": apiKey,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs),
  })

  if (!response.ok) {
    throw new BackendApiError(
      response.status,
      await readErrorMessage(response)
    )
  }

  return Buffer.from(await response.arrayBuffer())
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
