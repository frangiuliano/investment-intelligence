import Link from "next/link"

import { EmptyState, ErrorState } from "@/components/data-states"
import { PageHeader } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { listHypotheses } from "@/lib/api/research"
import type { Hypothesis } from "@/lib/api/types"
import {
  biasLabel,
  biasTone,
  formatDate,
  hypothesisSourceLabel,
  hypothesisSourceTone,
} from "@/lib/display"
import { partitionOpenHypotheses } from "@/lib/hypotheses"

import { HypothesisCloseForm } from "./hypothesis-close-form"
import { HypothesisCreateForm } from "./hypothesis-create-form"

export const dynamic = "force-dynamic"

function HypothesisCard({ hypothesis }: { hypothesis: Hypothesis }) {
  const isOpen = hypothesis.status === "open"
  const briefHref =
    hypothesis.source === "brief" && hypothesis.sourceRefId
      ? `/briefs/${hypothesis.sourceRefId}`
      : null

  return (
    <Card id={`hypothesis-${hypothesis.id}`} size="sm">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2 font-mono text-sm">
          {hypothesis.symbol}
          <Badge tone={biasTone(hypothesis.bias)}>
            {biasLabel(hypothesis.bias)}
          </Badge>
          <Badge tone={hypothesisSourceTone(hypothesis.source)}>
            {hypothesisSourceLabel(hypothesis.source)}
          </Badge>
        </CardTitle>
        <CardDescription>
          Abierta el {formatDate(hypothesis.createdAt)} · horizonte de{" "}
          {hypothesis.horizonDays} días
          {hypothesis.closedAt
            ? ` · cerrada el ${formatDate(hypothesis.closedAt)}`
            : ""}
          {briefHref ? (
            <>
              {" · "}
              <Link
                href={briefHref}
                className="underline decoration-ink/30 underline-offset-2 transition-colors hover:text-foreground hover:decoration-ink/60"
              >
                Ver informe
              </Link>
            </>
          ) : null}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div>
          <p className="mb-1 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-muted-foreground">
            Tesis
          </p>
          <p className="leading-6">{hypothesis.thesis}</p>
        </div>
        <div>
          <p className="mb-1 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-muted-foreground">
            Invalidación
          </p>
          <p className="leading-6">{hypothesis.invalidation}</p>
        </div>
        {hypothesis.closeNote ? (
          <div>
            <p className="mb-1 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-muted-foreground">
              Nota de cierre
            </p>
            <p className="leading-6 text-muted-foreground">
              {hypothesis.closeNote}
            </p>
          </div>
        ) : null}
        {isOpen ? (
          <HypothesisCloseForm
            hypothesisId={hypothesis.id}
            symbol={hypothesis.symbol}
          />
        ) : null}
      </CardContent>
    </Card>
  )
}

function HypothesisList({
  items,
  emptyMessage,
}: {
  items: Hypothesis[]
  emptyMessage: string
}) {
  if (items.length === 0) {
    return <EmptyState message={emptyMessage} />
  }

  return (
    <div className="space-y-4">
      {items.map((hypothesis) => (
        <HypothesisCard key={hypothesis.id} hypothesis={hypothesis} />
      ))}
    </div>
  )
}

export default async function HypothesesPage() {
  let open: Hypothesis[]
  let closed: Hypothesis[]
  try {
    ;[open, closed] = await Promise.all([
      listHypotheses("open"),
      listHypotheses("closed"),
    ])
  } catch {
    return (
      <section>
        <PageHeader
          areaCode="02"
          title="Hipótesis"
          description="Diario de análisis: cada tesis con su condición de invalidación y su horizonte."
        />
        <ErrorState message="No se pudieron cargar las hipótesis. Verificá que la API Nest esté activa y recargá la página." />
      </section>
    )
  }

  const { fromReports, manual } = partitionOpenHypotheses(open)

  return (
    <section className="space-y-10">
      <PageHeader
        areaCode="02"
        title="Hipótesis"
        description="Diario de análisis: cada tesis con su condición de invalidación y su horizonte. Las de informes se abren solas al pedir un análisis con postura."
      />

      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-8">
          <div>
            <h2 className="mb-4 font-heading text-xl tracking-tight">
              Abiertas ({open.length})
            </h2>
            {open.length === 0 ? (
              <EmptyState message="No hay hipótesis abiertas. Pedí un informe en Informes para que se abra sola, o usá el formulario opcional a la derecha." />
            ) : (
              <div className="space-y-8">
                <div>
                  <h3 className="mb-3 font-mono text-[0.68rem] uppercase tracking-[0.16em] text-muted-foreground">
                    Desde informes ({fromReports.length})
                  </h3>
                  <HypothesisList
                    items={fromReports}
                    emptyMessage="Todavía no hay hipótesis nacidas de un informe. Pedí un análisis con postura en Informes."
                  />
                </div>
                <div>
                  <h3 className="mb-3 font-mono text-[0.68rem] uppercase tracking-[0.16em] text-muted-foreground">
                    Manuales ({manual.length})
                  </h3>
                  <HypothesisList
                    items={manual}
                    emptyMessage="No hay hipótesis manuales abiertas."
                  />
                </div>
              </div>
            )}
          </div>

          <Separator />

          <div>
            <h2 className="mb-4 font-heading text-xl tracking-tight">
              Cerradas ({closed.length})
            </h2>
            {closed.length === 0 ? (
              <EmptyState message="Todavía no hay hipótesis cerradas." />
            ) : (
              <div className="space-y-4">
                {closed.map((hypothesis) => (
                  <HypothesisCard key={hypothesis.id} hypothesis={hypothesis} />
                ))}
              </div>
            )}
          </div>
        </div>

        <Card className="h-fit border-ink/10 bg-muted/20">
          <CardHeader>
            <p className="mb-2 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted-foreground">
              Opcional
            </p>
            <CardTitle>Abrir una hipótesis a mano</CardTitle>
            <CardDescription>
              El camino principal es pedir un informe: si trae postura, la
              hipótesis se abre sola. Usá este formulario solo cuando quieras
              registrar una tesis que no salió de un informe.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <HypothesisCreateForm />
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
