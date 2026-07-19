import { EmptyState, ErrorState } from "@/components/data-states"
import { PageHeader } from "@/components/page-header"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { listHoldings, listWatchlist } from "@/lib/api/portfolio"

import { HoldingCreateForm } from "./holding-create-form"
import { HoldingRow } from "./holding-row"
import { WatchlistSection } from "./watchlist-section"

export const dynamic = "force-dynamic"

export default async function HoldingsPage() {
  let holdings
  let watchlist
  try {
    ;[holdings, watchlist] = await Promise.all([
      listHoldings(),
      listWatchlist(),
    ])
  } catch {
    return (
      <section>
        <PageHeader
          areaCode="01"
          title="Holdings"
          description="Portfolio positions and watchlist that anchor research to the operator's actual exposure."
        />
        <ErrorState message="Holdings and watchlist could not be loaded. Check that the Nest API is running and reload." />
      </section>
    )
  }

  return (
    <section className="space-y-10">
      <PageHeader
        areaCode="01"
        title="Holdings"
        description="Portfolio positions and watchlist that anchor research to the operator's actual exposure."
      />

      <Card>
        <CardHeader>
          <CardTitle>Positions</CardTitle>
          <CardDescription>
            Current holdings weighted by the relevance engine and used as
            context for briefs.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {holdings.length === 0 ? (
            <EmptyState message="No holdings yet. Add the first position below." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Avg entry</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {holdings.map((holding) => (
                  <HoldingRow key={holding.id} holding={holding} />
                ))}
              </TableBody>
            </Table>
          )}
          <HoldingCreateForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Watchlist</CardTitle>
          <CardDescription>
            Symbols without a position that should still surface relevant
            alerts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WatchlistSection entries={watchlist} />
        </CardContent>
      </Card>
    </section>
  )
}
