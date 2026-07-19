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
import { formatDateTime, stanceTone } from "@/lib/display"

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
          title="Briefs"
          description="On-demand educational briefs per ticker: fundamentals, technicals, risks, and an explicit invalidation."
        />
        <ErrorState message="Briefs could not be loaded. Check that the Nest API is running and reload." />
      </section>
    )
  }

  return (
    <section>
      <PageHeader
        areaCode="04"
        title="Briefs"
        description="On-demand educational briefs per ticker: fundamentals, technicals, risks, and an explicit invalidation."
      >
        <BriefRequestForm />
      </PageHeader>

      {briefs.items.length === 0 ? (
        <EmptyState message="No briefs yet. Request one for a ticker to get started." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Symbol</TableHead>
              <TableHead>Stance</TableHead>
              <TableHead>Market data</TableHead>
              <TableHead>Generated</TableHead>
              <TableHead className="text-right">Detail</TableHead>
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
                      {brief.stance}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {brief.marketSource
                    ? `${brief.marketSource} · ${formatDateTime(brief.marketAsOf)}`
                    : "unavailable"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDateTime(brief.createdAt)}
                </TableCell>
                <TableCell className="text-right">
                  <Link
                    href={`/briefs/${brief.id}`}
                    className="text-xs font-medium underline-offset-4 hover:underline"
                  >
                    Open brief
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
