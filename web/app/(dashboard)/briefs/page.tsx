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
import { listBriefs } from "@/lib/api/research"
import type { Paginated, ResearchBrief } from "@/lib/api/types"
import { formatDateTime, stanceLabel, stanceTone } from "@/lib/display"

import { BriefRequestForm } from "./brief-request-form"

export const dynamic = "force-dynamic"

type BriefsPageProps = {
  searchParams: Promise<{ page?: string }>
}

export default async function BriefsPage({ searchParams }: BriefsPageProps) {
  const params = await searchParams
  const page = parsePageParam(params.page)

  let briefs: Paginated<ResearchBrief>
  try {
    briefs = await listBriefs({ page })
  } catch {
    return (
      <section>
        <PageHeader
          areaCode="04"
          title="Informes"
          description="Informes educativos por símbolo bajo demanda: fundamentos, análisis técnico, riesgos e invalidación explícita."
        />
        <ErrorState message="No se pudieron cargar los informes. Verificá que la API Nest esté activa y recargá la página." />
      </section>
    )
  }

  return (
    <section>
      <PageHeader
        areaCode="04"
        title="Informes"
        description="Informes educativos por símbolo bajo demanda: fundamentos, análisis técnico, riesgos e invalidación explícita."
      >
        <BriefRequestForm />
      </PageHeader>

      {briefs.items.length === 0 ? (
        <EmptyState message="Todavía no hay informes. Solicitá uno para un símbolo." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Símbolo</TableHead>
              <TableHead>Postura</TableHead>
              <TableHead>Datos de mercado</TableHead>
              <TableHead>Generado</TableHead>
              <TableHead className="text-right">Detalle</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {briefs.items.map((brief) => (
              <TableRow key={brief.id}>
                <TableCell className="font-mono text-xs font-semibold">
                  {brief.symbol}
                </TableCell>
                <TableCell>
                  {brief.stance ? (
                    <Badge tone={stanceTone(brief.stance)}>
                      {stanceLabel(brief.stance)}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {brief.marketSource
                    ? `${brief.marketSource} · ${formatDateTime(brief.marketAsOf)}`
                    : "no disponibles"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDateTime(brief.createdAt)}
                </TableCell>
                <TableCell className="text-right">
                  <Link
                    href={`/briefs/${brief.id}`}
                    className="text-xs font-medium underline-offset-4 hover:underline"
                  >
                    Abrir informe
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Pagination
        basePath="/briefs"
        page={briefs.page}
        limit={briefs.limit}
        total={briefs.total}
      />
    </section>
  )
}
