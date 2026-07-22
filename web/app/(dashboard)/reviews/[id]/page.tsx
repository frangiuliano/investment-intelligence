import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"

import { ErrorState } from "@/components/data-states"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { BackendApiError } from "@/lib/api/client"
import { getReview } from "@/lib/api/research"
import type { HypothesisReview } from "@/lib/api/types"
import {
  formatDateTime,
  formatReturnPct,
  outcomeLabel,
  outcomeTone,
  priceUnavailableReasonLabel,
} from "@/lib/display"

export const dynamic = "force-dynamic"

type ReviewDetailPageProps = {
  params: Promise<{ id: string }>
}

const NOTE_SECTIONS: Array<{
  key: "explanation" | "thesisQualityNote" | "timingNote" | "learningNote"
  title: string
}> = [
  { key: "explanation", title: "Qué ocurrió" },
  { key: "thesisQualityNote", title: "Calidad de la tesis" },
  { key: "timingNote", title: "Momento" },
  { key: "learningNote", title: "Aprendizaje" },
]

export default async function ReviewDetailPage({
  params,
}: ReviewDetailPageProps) {
  const { id } = await params

  let review: HypothesisReview
  try {
    review = await getReview(id)
  } catch (error) {
    if (error instanceof BackendApiError && error.status === 404) {
      notFound()
    }
    return (
      <section>
        <ErrorState message="No se pudo cargar la revisión. Verificá que la API Nest esté activa y recargá la página." />
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-3xl">
      <Link
        href="/reviews"
        className="mb-8 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Todas las revisiones
      </Link>

      <div className="mb-10 border-b border-ink/10 pb-6">
        <p className="mb-3 font-mono text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
          Revisión de hipótesis / {formatDateTime(review.createdAt)}
        </p>
        <h1 className="font-heading text-4xl tracking-[-0.03em]">
          {outcomeLabel(review.outcome)}
        </h1>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Badge tone={outcomeTone(review.outcome)}>
            {outcomeLabel(review.outcome)}
          </Badge>
          <Badge>retorno: {formatReturnPct(review.priceReturnPct)}</Badge>
          {review.marketSource ? (
            <Badge>
              datos de mercado: {review.marketSource} ·{" "}
              {formatDateTime(review.priceAsOf)}
            </Badge>
          ) : (
            <Badge tone="caution">
              precio no disponible
              {review.priceUnavailableReason
                ? `: ${priceUnavailableReasonLabel(review.priceUnavailableReason)}`
                : ""}
            </Badge>
          )}
        </div>
        {review.priceStart !== null && review.priceEnd !== null ? (
          <p className="mt-3 font-mono text-xs text-muted-foreground">
            {review.priceStart} → {review.priceEnd}
          </p>
        ) : null}
      </div>

      <div className="space-y-6">
        {NOTE_SECTIONS.map(({ key, title }) =>
          review[key] ? (
            <Card key={key} size="sm">
              <CardHeader>
                <CardTitle>{title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-7 whitespace-pre-line">
                  {review[key]}
                </p>
              </CardContent>
            </Card>
          ) : null
        )}
      </div>
    </section>
  )
}
