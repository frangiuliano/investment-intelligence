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
          title="Cartera"
          description="Posiciones y lista de seguimiento que conectan el análisis con la exposición real del operador."
        />
        <ErrorState message="No se pudieron cargar la cartera ni la lista de seguimiento. Verificá que la API Nest esté activa y recargá la página." />
      </section>
    )
  }

  return (
    <section className="space-y-10">
      <PageHeader
        areaCode="01"
        title="Cartera"
        description="Posiciones y lista de seguimiento que conectan el análisis con la exposición real del operador."
      />

      <Card>
        <CardHeader>
          <CardTitle>Posiciones</CardTitle>
          <CardDescription>
            Activos actuales ponderados por el motor de relevancia y usados
            como contexto para los informes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {holdings.length === 0 ? (
            <EmptyState message="Todavía no hay posiciones. Agregá la primera debajo." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Símbolo</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Cantidad</TableHead>
                  <TableHead>Entrada prom.</TableHead>
                  <TableHead>Costo est.</TableHead>
                  <TableHead>Moneda</TableHead>
                  <TableHead>Notas</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
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
          <CardTitle>Lista de seguimiento</CardTitle>
          <CardDescription>
            Símbolos sin una posición que igualmente deben mostrar alertas
            relevantes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WatchlistSection entries={watchlist} />
        </CardContent>
      </Card>
    </section>
  )
}
