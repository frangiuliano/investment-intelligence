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
import { biasTone, formatDate } from "@/lib/display"

import { HypothesisCloseForm } from "./hypothesis-close-form"
import { HypothesisCreateForm } from "./hypothesis-create-form"

export const dynamic = "force-dynamic"

function HypothesisCard({ hypothesis }: { hypothesis: Hypothesis }) {
  const isOpen = hypothesis.status === "open"

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-mono text-sm">
          {hypothesis.symbol}
          <Badge tone={biasTone(hypothesis.bias)}>{hypothesis.bias}</Badge>
          <Badge>{hypothesis.source}</Badge>
        </CardTitle>
        <CardDescription>
          Opened {formatDate(hypothesis.createdAt)} · horizon{" "}
          {hypothesis.horizonDays} days
          {hypothesis.closedAt
            ? ` · closed ${formatDate(hypothesis.closedAt)}`
            : ""}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div>
          <p className="mb-1 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-muted-foreground">
            Thesis
          </p>
          <p className="leading-6">{hypothesis.thesis}</p>
        </div>
        <div>
          <p className="mb-1 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-muted-foreground">
            Invalidation
          </p>
          <p className="leading-6">{hypothesis.invalidation}</p>
        </div>
        {hypothesis.closeNote ? (
          <div>
            <p className="mb-1 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-muted-foreground">
              Close note
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
          title="Hypotheses"
          description="Research journal: every thesis, its invalidation condition, and its horizon."
        />
        <ErrorState message="Hypotheses could not be loaded. Check that the Nest API is running and reload." />
      </section>
    )
  }

  return (
    <section className="space-y-10">
      <PageHeader
        areaCode="02"
        title="Hypotheses"
        description="Research journal: every thesis, its invalidation condition, and its horizon."
      />

      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-8">
          <div>
            <h2 className="mb-4 font-heading text-xl tracking-tight">
              Open ({open.length})
            </h2>
            {open.length === 0 ? (
              <EmptyState message="No open hypotheses. Open one from the form on the right." />
            ) : (
              <div className="space-y-4">
                {open.map((hypothesis) => (
                  <HypothesisCard key={hypothesis.id} hypothesis={hypothesis} />
                ))}
              </div>
            )}
          </div>

          <Separator />

          <div>
            <h2 className="mb-4 font-heading text-xl tracking-tight">
              Closed ({closed.length})
            </h2>
            {closed.length === 0 ? (
              <EmptyState message="No closed hypotheses yet." />
            ) : (
              <div className="space-y-4">
                {closed.map((hypothesis) => (
                  <HypothesisCard key={hypothesis.id} hypothesis={hypothesis} />
                ))}
              </div>
            )}
          </div>
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Open a hypothesis</CardTitle>
            <CardDescription>
              A thesis is only useful with an explicit invalidation and a
              horizon. Reviews grade it later.
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
