export type Paginated<T> = {
  items: T[]
  page: number
  limit: number
  total: number
}

export const HOLDING_ASSET_TYPES = [
  "equity",
  "cedear",
  "bond",
  "treasury",
  "other",
] as const

export type HoldingAssetType = (typeof HOLDING_ASSET_TYPES)[number]

export type Holding = {
  id: string
  symbol: string
  assetType: HoldingAssetType
  quantity: string
  currency: string
  avgEntryPrice: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export type WatchlistEntry = {
  id: string
  symbol: string
  notes: string | null
  createdAt: string
  updatedAt: string
}

export const HYPOTHESIS_BIASES = ["bullish", "bearish", "watch"] as const

export type HypothesisBias = (typeof HYPOTHESIS_BIASES)[number]

export type HypothesisStatus = "open" | "closed"

export type Hypothesis = {
  id: string
  symbol: string
  bias: HypothesisBias
  thesis: string
  invalidation: string
  horizonDays: number
  status: HypothesisStatus
  source: "manual" | "brief" | "alert"
  sourceRefId: string | null
  closedAt: string | null
  closeNote: string | null
  createdAt: string
  updatedAt: string
}

export type NewsAnalysis = {
  id: string
  articleId: string
  headline: string
  summary: string
  sentiment: string
  tickers: string[]
  materiality: string
  eventType: string
  model: string
  promptVersion?: string | null
  knowledgeVersion?: string | null
  analyzedAt: string
}

export type NewsArticle = {
  id: string
  title: string
  url: string
  source: string
  publishedAt: string | null
  createdAt: string
  analysis?: NewsAnalysis | null
}

export type Notification = {
  id: string
  articleId: string
  channel: string
  payload: Record<string, unknown> | null
  sentAt: string
  article?: NewsArticle | null
}

export const BRIEF_SECTION_KEYS = [
  "overview",
  "fundamental",
  "technical",
  "risks",
  "invalidation",
  "disclaimer",
] as const

export type BriefSectionKey = (typeof BRIEF_SECTION_KEYS)[number]

export type BriefStance =
  | "enter"
  | "avoid"
  | "watch"
  | "hold"
  | "add"
  | "reduce"
  | "exit"

export type ResearchBrief = {
  id: string
  symbol: string
  locale: string
  sections: Record<BriefSectionKey, string>
  promptVersion: string
  knowledgeVersion?: string | null
  stance: BriefStance | null
  stanceRationale: string | null
  marketAsOf: string | null
  marketSource: string | null
  holdingId: string | null
  createdAt: string
  chartAvailable?: boolean
}

export type HypothesisReviewOutcome =
  | "thesis_confirmed"
  | "thesis_rejected"
  | "timing_issue"
  | "inconclusive"

export type HypothesisReview = {
  id: string
  reviewRunId: string
  hypothesisId: string
  outcome: HypothesisReviewOutcome
  thesisQualityNote: string
  timingNote: string
  learningNote: string
  explanation: string
  priceReturnPct: number | null
  priceStart: number | null
  priceEnd: number | null
  priceAsOf: string | null
  marketSource: string | null
  priceUnavailableReason: string | null
  locale: string
  createdAt: string
}

export type ReviewRunResult = {
  run: {
    id: string
    periodStart: string
    periodEnd: string
    reviewedCount: number
    skippedCount: number
    summaryMessage: string | null
  }
  reviews: HypothesisReview[]
  notified: boolean
}

export const FEEDBACK_TARGET_TYPES = [
  "analysis",
  "brief",
  "notification",
] as const

export type FeedbackTargetType = (typeof FEEDBACK_TARGET_TYPES)[number]

export const FEEDBACK_LABELS = ["useful", "noise"] as const

export type FeedbackLabel = (typeof FEEDBACK_LABELS)[number]

export type OperatorFeedback = {
  id: string
  targetType: FeedbackTargetType
  targetId: string
  label: FeedbackLabel
  promptVersion: string | null
  knowledgeVersion: string | null
  source: string
  actor: string
  createdAt: string
}

export type AssetSuggestion = {
  symbol: string
  name: string
  assetType: string | null
  exchange: string | null
  prioritized: boolean
}

export type AssetSuggestResult = {
  items: AssetSuggestion[]
  source: string
}
