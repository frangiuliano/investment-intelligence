import "server-only"

import { backendFetch, backendFetchBinary } from "@/lib/api/client"
import { buildListPath, type ListParams } from "@/lib/api/query"
import type {
  Hypothesis,
  HypothesisReview,
  HypothesisStatus,
  Paginated,
  ResearchBrief,
  ReviewRunResult,
} from "@/lib/api/types"

export type ListHypothesesParams = {
  status?: HypothesisStatus
  source?: Hypothesis["source"]
  sourceRefId?: string
}

export function listHypotheses(
  statusOrParams: HypothesisStatus | ListHypothesesParams
): Promise<Hypothesis[]> {
  const params: ListHypothesesParams =
    typeof statusOrParams === "string"
      ? { status: statusOrParams }
      : statusOrParams

  const search = new URLSearchParams()
  if (params.status) {
    search.set("status", params.status)
  }
  if (params.source) {
    search.set("source", params.source)
  }
  if (params.sourceRefId) {
    search.set("sourceRefId", params.sourceRefId)
  }

  const query = search.toString()
  return backendFetch<Hypothesis[]>(
    query ? `/hypotheses?${query}` : "/hypotheses"
  )
}

export type HypothesisInput = {
  symbol?: string
  bias?: string
  thesis?: string
  invalidation?: string
  horizonDays?: number
}

export function createHypothesis(input: HypothesisInput): Promise<Hypothesis> {
  return backendFetch<Hypothesis>("/hypotheses", {
    method: "POST",
    body: input,
  })
}

export function closeHypothesis(
  id: string,
  closeNote?: string
): Promise<Hypothesis> {
  return backendFetch<Hypothesis>(`/hypotheses/${id}/close`, {
    method: "PATCH",
    body: closeNote ? { closeNote } : {},
  })
}

export function listBriefs(
  params: ListParams
): Promise<Paginated<ResearchBrief>> {
  return backendFetch<Paginated<ResearchBrief>>(
    buildListPath("/briefs", params)
  )
}

export function getBrief(id: string): Promise<ResearchBrief> {
  return backendFetch<ResearchBrief>(`/briefs/${id}`)
}

export function getBriefChartPng(id: string): Promise<Buffer> {
  return backendFetchBinary(`/briefs/${id}/chart`)
}

// Brief generation calls Gemini + market data synchronously; allow more time
// than the default request timeout.
export function requestBrief(ticker: string): Promise<ResearchBrief> {
  return backendFetch<ResearchBrief>("/briefs", {
    method: "POST",
    body: { ticker },
    timeoutMs: 120_000,
  })
}

export function listReviews(
  params: ListParams
): Promise<Paginated<HypothesisReview>> {
  return backendFetch<Paginated<HypothesisReview>>(
    buildListPath("/reviews", params)
  )
}

export function getReview(id: string): Promise<HypothesisReview> {
  return backendFetch<HypothesisReview>(`/reviews/${id}`)
}

export function runPeriodReview(): Promise<ReviewRunResult> {
  return backendFetch<ReviewRunResult>("/reviews/run", {
    method: "POST",
    body: {},
    timeoutMs: 120_000,
  })
}
