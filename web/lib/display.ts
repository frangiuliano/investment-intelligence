import type {
  BriefStance,
  HypothesisBias,
  HypothesisReviewOutcome,
} from "@/lib/api/types"

export type BadgeTone = "positive" | "negative" | "caution" | "neutral"

const STANCE_TONES: Record<BriefStance, BadgeTone> = {
  enter: "positive",
  add: "positive",
  hold: "neutral",
  watch: "neutral",
  reduce: "caution",
  avoid: "caution",
  exit: "negative",
}

export function stanceTone(stance: BriefStance): BadgeTone {
  return STANCE_TONES[stance] ?? "neutral"
}

const OUTCOME_LABELS: Record<HypothesisReviewOutcome, string> = {
  thesis_confirmed: "Thesis confirmed",
  thesis_rejected: "Thesis rejected",
  timing_issue: "Timing issue",
  inconclusive: "Inconclusive",
}

const OUTCOME_TONES: Record<HypothesisReviewOutcome, BadgeTone> = {
  thesis_confirmed: "positive",
  thesis_rejected: "negative",
  timing_issue: "caution",
  inconclusive: "neutral",
}

export function outcomeLabel(outcome: HypothesisReviewOutcome): string {
  return OUTCOME_LABELS[outcome] ?? outcome
}

export function outcomeTone(outcome: HypothesisReviewOutcome): BadgeTone {
  return OUTCOME_TONES[outcome] ?? "neutral"
}

const BIAS_TONES: Record<HypothesisBias, BadgeTone> = {
  bullish: "positive",
  bearish: "negative",
  watch: "neutral",
}

export function biasTone(bias: HypothesisBias): BadgeTone {
  return BIAS_TONES[bias] ?? "neutral"
}

export function sentimentTone(sentiment: string): BadgeTone {
  const normalized = sentiment.toLowerCase()
  if (normalized.includes("positive") || normalized.includes("bullish")) {
    return "positive"
  }
  if (normalized.includes("negative") || normalized.includes("bearish")) {
    return "negative"
  }
  return "neutral"
}

const dateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
})

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeZone: "UTC",
})

export function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return "—"
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return "—"
  }
  return `${dateTimeFormatter.format(date)} UTC`
}

export function formatDate(value: string | null | undefined): string {
  if (!value) {
    return "—"
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return "—"
  }
  return dateFormatter.format(date)
}

export function formatReturnPct(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "—"
  }
  const sign = value > 0 ? "+" : ""
  return `${sign}${value.toFixed(2)}%`
}
