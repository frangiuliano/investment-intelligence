import Link from "next/link"

import { EmptyState, ErrorState } from "@/components/data-states"
import { PageHeader } from "@/components/page-header"
import { Pagination } from "@/components/pagination"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { parsePageParam } from "@/lib/api/query"
import { listHypotheses, listReviews } from "@/lib/api/research"
import type { HypothesisReview, Paginated } from "@/lib/api/types"
import {
  formatDateTime,
  formatReturnPct,
  outcomeLabel,
  outcomeTone,
} from "@/lib/display"

import { RunReviewForm } from "./run-review-form"

export const dynamic = "force-dynamic"

type ReviewsPageProps = {
  searchParams: Promise<{ page?: string }>
}

async function buildSymbolIndex(): Promise<Map<string, string>> {
  const [open, closed] = await Promise.all([
    listHypotheses("open"),
    listHypotheses("closed"),
  ])
  return new Map(
    [...open, ...closed].map((hypothesis) => [
      hypothesis.id,
      hypothesis.symbol,
    ])
  )
}

export default async function ReviewsPage({ searchParams }: ReviewsPageProps) {
  const params = await searchParams
  const page = parsePageParam(params.page)

  let reviews: Paginated<HypothesisReview>
  let symbolsByHypothesisId: Map<string, string>
  try {
    ;[reviews, symbolsByHypothesisId] = await Promise.all([
      listReviews({ page }),
      buildSymbolIndex(),
    ])
  } catch {
    return (
      <section>
        <PageHeader
          areaCode="05"
          title="Revisiones"
          description="Evaluación periódica de hipótesis contra datos de mercado: aciertos, errores y aprendizajes."
        />
        <ErrorState message="No se pudieron cargar las revisiones. Verificá que la API Nest esté activa y recargá la página." />
      </section>
    )
  }

  return (
    <section>
      <PageHeader
        areaCode="05"
        title="Revisiones"
        description="Evaluación periódica de hipótesis contra datos de mercado: aciertos, errores y aprendizajes."
      >
        <RunReviewForm />
      </PageHeader>

      {reviews.items.length === 0 ? (
        <EmptyState message="Todavía no hay revisiones. Ejecutá una cuando las hipótesis alcancen su horizonte." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Hipótesis</TableHead>
              <TableHead>Resultado</TableHead>
              <TableHead>Retorno</TableHead>
              <TableHead>Revisada</TableHead>
              <TableHead className="text-right">Detalle</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reviews.items.map((review) => (
              <TableRow key={review.id}>
                <TableCell className="font-mono text-xs font-semibold">
                  {symbolsByHypothesisId.get(review.hypothesisId) ??
                    review.hypothesisId.slice(0, 8)}
                </TableCell>
                <TableCell>
                  <Badge tone={outcomeTone(review.outcome)}>
                    {outcomeLabel(review.outcome)}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {formatReturnPct(review.priceReturnPct)}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDateTime(review.createdAt)}
                </TableCell>
                <TableCell className="text-right">
                  <Link
                    href={`/reviews/${review.id}`}
                    className="text-xs font-medium underline-offset-4 hover:underline"
                  >
                    Abrir revisión
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Pagination
        basePath="/reviews"
        page={reviews.page}
        limit={reviews.limit}
        total={reviews.total}
      />
    </section>
  )
}
