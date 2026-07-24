import type {
  BriefStance,
  HoldingAssetType,
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

const STANCE_LABELS: Record<BriefStance, string> = {
  enter: "Entrar",
  avoid: "Evitar",
  watch: "Observar",
  hold: "Mantener",
  add: "Agregar",
  reduce: "Reducir",
  exit: "Salir",
}

export function stanceLabel(stance: BriefStance): string {
  return STANCE_LABELS[stance] ?? stance
}

const OUTCOME_LABELS: Record<HypothesisReviewOutcome, string> = {
  thesis_confirmed: "Tesis confirmada",
  thesis_rejected: "Tesis rechazada",
  timing_issue: "Momento inadecuado",
  inconclusive: "No concluyente",
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

const BIAS_LABELS: Record<HypothesisBias, string> = {
  bullish: "Alcista",
  bearish: "Bajista",
  watch: "Observar",
}

export function biasLabel(bias: HypothesisBias): string {
  return BIAS_LABELS[bias] ?? bias
}

const ASSET_TYPE_LABELS: Record<HoldingAssetType, string> = {
  equity: "Acción",
  cedear: "CEDEAR",
  bond: "Bono",
  treasury: "Tesoro",
  other: "Otro",
}

export function assetTypeLabel(assetType: HoldingAssetType): string {
  return ASSET_TYPE_LABELS[assetType] ?? assetType
}

const HYPOTHESIS_SOURCE_LABELS: Record<string, string> = {
  manual: "Manual",
  brief: "Informe",
  alert: "Alerta",
}

export function hypothesisSourceLabel(source: string): string {
  return HYPOTHESIS_SOURCE_LABELS[source] ?? source
}

export function hypothesisSourceTone(
  source: string
): "neutral" | "positive" | "caution" {
  if (source === "brief") {
    return "positive"
  }
  if (source === "alert") {
    return "caution"
  }
  return "neutral"
}

const SENTIMENT_LABELS: Record<string, string> = {
  positive: "Positivo",
  negative: "Negativo",
  neutral: "Neutral",
}

export function sentimentLabel(sentiment: string): string {
  const normalized = sentiment.trim().toLowerCase()
  return SENTIMENT_LABELS[normalized] ?? sentiment
}

const MATERIALITY_LABELS: Record<string, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
}

export function materialityLabel(materiality: string): string {
  const normalized = materiality.trim().toLowerCase()
  return MATERIALITY_LABELS[normalized] ?? materiality
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  ipo: "IPO",
  earnings: "Resultados",
  m_and_a: "Fusión/adquisición",
  regulation: "Regulación",
  other: "Otro",
}

export function eventTypeLabel(eventType: string): string | null {
  const normalized = eventType.trim().toLowerCase()
  if (!normalized || normalized === "none") {
    return null
  }
  return EVENT_TYPE_LABELS[normalized] ?? eventType
}

const PRICE_UNAVAILABLE_REASON_LABELS: Record<string, string> = {
  provider_error: "error del proveedor",
  no_data: "sin datos",
  invalid_symbol: "símbolo inválido",
  insufficient_data: "datos insuficientes",
}

export function priceUnavailableReasonLabel(reason: string): string {
  return PRICE_UNAVAILABLE_REASON_LABELS[reason] ?? reason.replaceAll("_", " ")
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

const dateTimeFormatter = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
})

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
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
  return `${new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    signDisplay: "exceptZero",
  }).format(value)}%`
}
