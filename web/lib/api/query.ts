export type ListParams = {
  page?: number
  limit?: number
  ticker?: string
  from?: string
  to?: string
}

export function buildListPath(basePath: string, params: ListParams): string {
  const search = new URLSearchParams()

  if (params.page !== undefined && params.page > 1) {
    search.set("page", String(params.page))
  }
  if (params.limit !== undefined) {
    search.set("limit", String(params.limit))
  }
  if (params.ticker) {
    search.set("ticker", params.ticker)
  }
  if (params.from) {
    search.set("from", params.from)
  }
  if (params.to) {
    search.set("to", params.to)
  }

  const query = search.toString()
  return query ? `${basePath}?${query}` : basePath
}

export function parsePageParam(value: string | undefined): number {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1
}

export function totalPages(total: number, limit: number): number {
  return Math.max(1, Math.ceil(total / limit))
}
