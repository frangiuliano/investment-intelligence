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

export function listHypotheses(
  status: HypothesisStatus
): Promise<Hypothesis[]> {
  return backendFetch<Hypothesis[]>(`/hypotheses?status=${status}`)
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
