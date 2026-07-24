import { ArrowLeft, TriangleAlert } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"

import { FeedbackButtons } from "@/components/feedback-buttons"
import { ErrorState } from "@/components/data-states"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { briefChartSrc, shouldShowBriefChart } from "@/lib/api/brief-chart"
import { BackendApiError } from "@/lib/api/client"
import { getBrief, listHypotheses } from "@/lib/api/research"
import {
  BRIEF_SECTION_KEYS,
  type BriefSectionKey,
  type Hypothesis,
  type ResearchBrief,
} from "@/lib/api/types"
import {
  formatDateTime,
  hypothesisSourceLabel,
  stanceLabel,
  stanceTone,
} from "@/lib/display"
import { findHypothesisForBrief } from "@/lib/hypotheses"

export const dynamic = "force-dynamic"

const SECTION_TITLES: Record<BriefSectionKey, string> = {
  overview: "Resumen",
  fundamental: "Análisis fundamental",
  technical: "Análisis técnico",
  risks: "Riesgos",
  invalidation: "Invalidación",
  disclaimer: "Aviso legal",
}

type BriefDetailPageProps = {
  params: Promise<{ id: string }>
}

function BriefHypothesisLink({
  hypothesis,
}: {
  hypothesis: Hypothesis | null | undefined
}) {
  if (hypothesis === undefined) {
    return null
  }

  if (hypothesis === null) {
    return (
      <p className="mt-4 text-sm text-muted-foreground">
        Este informe no tiene una hipótesis vinculada (suele ocurrir si no hubo
        postura o faltaron datos de mercado).
      </p>
    )
  }

  const statusLabel = hypothesis.status === "open" ? "abierta" : "cerrada"

  return (
    <p className="mt-4 text-sm">
      <span className="text-muted-foreground">Hipótesis {statusLabel}</span>
      {" · "}
      <Badge tone="positive">{hypothesisSourceLabel(hypothesis.source)}</Badge>
      {" "}
      <Link
        href={`/hypotheses#hypothesis-${hypothesis.id}`}
        className="font-medium underline decoration-ink/30 underline-offset-2 transition-colors hover:text-foreground hover:decoration-ink/60"
      >
        Ver en Hipótesis
      </Link>
    </p>
  )
}

export default async function BriefDetailPage({
  params,
}: BriefDetailPageProps) {
  const { id } = await params

  let brief: ResearchBrief
  try {
    brief = await getBrief(id)
  } catch (error) {
    if (error instanceof BackendApiError && error.status === 404) {
      notFound()
    }
    return (
      <section>
        <ErrorState message="No se pudo cargar el informe. Verificá que la API Nest esté activa y recargá la página." />
      </section>
    )
  }

  let linkedHypothesis: Hypothesis | null | undefined
  try {
    const matches = await listHypotheses({
      source: "brief",
      sourceRefId: id,
    })
    linkedHypothesis = findHypothesisForBrief(matches, id)
  } catch {
    linkedHypothesis = undefined
  }

  const contentSections = BRIEF_SECTION_KEYS.filter(
    (key) => key !== "disclaimer" && brief.sections[key]
  )
  const showChart = shouldShowBriefChart(brief.chartAvailable)

  return (
    <section className="mx-auto max-w-3xl">
      <Link
        href="/briefs"
        className="mb-8 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Todos los informes
      </Link>

      <div className="mb-10 border-b border-ink/10 pb-6">
        <p className="mb-3 font-mono text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
          Informe de análisis / {formatDateTime(brief.createdAt)}
        </p>
        <h1 className="font-heading text-4xl tracking-[-0.03em] sm:text-5xl">
          {brief.symbol}
        </h1>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {brief.stance ? (
            <Badge tone={stanceTone(brief.stance)}>
              postura: {stanceLabel(brief.stance)}
            </Badge>
          ) : null}
          <Badge>
            {brief.marketSource
              ? `datos de mercado: ${brief.marketSource} · ${formatDateTime(brief.marketAsOf)}`
              : "datos de mercado no disponibles"}
          </Badge>
        </div>
        {brief.stanceRationale ? (
          <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">
            {brief.stanceRationale}
          </p>
        ) : null}
        <BriefHypothesisLink hypothesis={linkedHypothesis} />
        <div className="mt-6">
          <FeedbackButtons
            targetType="brief"
            targetId={brief.id}
            revalidatePath={`/briefs/${brief.id}`}
          />
        </div>
      </div>

      <div className="space-y-6">
        {showChart ? (
          <Card size="sm" className="overflow-hidden">
            <CardHeader className="border-b border-ink/10">
              <CardTitle>Gráfico técnico</CardTitle>
              <CardDescription>
                Misma imagen enviada por Telegram al generar el informe.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <figure>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={briefChartSrc(brief.id)}
                  alt={`Gráfico técnico de ${brief.symbol}`}
                  className="h-auto w-full bg-paper"
                />
                <figcaption className="border-t border-ink/10 px-3 py-3 font-mono text-[0.65rem] uppercase tracking-[0.16em] text-muted-foreground">
                  {brief.symbol} · análisis técnico
                </figcaption>
              </figure>
            </CardContent>
          </Card>
        ) : null}

        {contentSections.map((key) => (
          <Card key={key} size="sm">
            <CardHeader>
              <CardTitle>{SECTION_TITLES[key]}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-7 whitespace-pre-line">
                {brief.sections[key]}
              </p>
            </CardContent>
          </Card>
        ))}

        {brief.sections.disclaimer ? (
          <Card size="sm" className="border-signal/30 bg-signal/5">
            <CardContent className="flex items-start gap-3 py-4">
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-signal" />
              <p className="text-sm leading-6">{brief.sections.disclaimer}</p>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </section>
  )
}
