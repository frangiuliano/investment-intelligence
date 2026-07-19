import { ExternalLink } from "lucide-react"

import { EmptyState, ErrorState } from "@/components/data-states"
import { PageHeader } from "@/components/page-header"
import { Pagination } from "@/components/pagination"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { listNotifications } from "@/lib/api/alerts"
import { parsePageParam } from "@/lib/api/query"
import type { Notification, Paginated } from "@/lib/api/types"
import {
  eventTypeLabel,
  formatDateTime,
  materialityLabel,
  sentimentLabel,
  sentimentTone,
} from "@/lib/display"

export const dynamic = "force-dynamic"

type AlertsPageProps = {
  searchParams: Promise<{ page?: string; ticker?: string }>
}

function AlertCard({ notification }: { notification: Notification }) {
  const article = notification.article
  const analysis = article?.analysis
  const eventLabel = analysis?.eventType
    ? eventTypeLabel(analysis.eventType)
    : null

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-base leading-snug">
          {analysis?.headline ?? article?.title ?? "Alerta"}
        </CardTitle>
        <CardDescription>
          {formatDateTime(notification.sentAt)} · vía {notification.channel}
          {article?.source ? ` · ${article.source}` : ""}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {analysis?.summary ? (
          <p className="leading-6 text-muted-foreground">{analysis.summary}</p>
        ) : null}
        <div className="flex flex-wrap items-center gap-1.5">
          {analysis?.sentiment ? (
            <Badge tone={sentimentTone(analysis.sentiment)}>
              {sentimentLabel(analysis.sentiment)}
            </Badge>
          ) : null}
          {analysis?.materiality ? (
            <Badge>materialidad: {materialityLabel(analysis.materiality)}</Badge>
          ) : null}
          {eventLabel ? <Badge>{eventLabel}</Badge> : null}
          {(analysis?.tickers ?? []).map((ticker) => (
            <Badge key={ticker} tone="caution">
              {ticker}
            </Badge>
          ))}
        </div>
        {article?.url ? (
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-foreground underline-offset-4 hover:underline"
          >
            Leer artículo original
            <ExternalLink className="size-3" />
          </a>
        ) : null}
      </CardContent>
    </Card>
  )
}

export default async function AlertsPage({ searchParams }: AlertsPageProps) {
  const params = await searchParams
  const page = parsePageParam(params.page)
  const ticker = params.ticker?.trim().toUpperCase() || undefined

  let alerts: Paginated<Notification>
  try {
    alerts = await listNotifications({ page, ticker })
  } catch {
    return (
      <section>
        <PageHeader
          areaCode="03"
          title="Alertas"
          description="Notificaciones que el proceso automático ya envió. Solo lectura: las alertas nunca se crean manualmente."
        />
        <ErrorState message="No se pudieron cargar las alertas. Verificá que la API Nest esté activa y recargá la página." />
      </section>
    )
  }

  return (
    <section>
      <PageHeader
        areaCode="03"
        title="Alertas"
        description="Notificaciones que el proceso automático ya envió. Solo lectura: las alertas nunca se crean manualmente."
      >
        <form action="/alerts" method="get" className="flex items-end gap-2">
          <Input
            name="ticker"
            defaultValue={ticker ?? ""}
            placeholder="Filtrar por símbolo"
            className="w-40 uppercase"
            aria-label="Filtrar por símbolo"
          />
          <Button type="submit" variant="outline">
            Filtrar
          </Button>
        </form>
      </PageHeader>

      {alerts.items.length === 0 ? (
        <EmptyState
          message={
            ticker
              ? `Todavía no se enviaron alertas para ${ticker}.`
              : "Todavía no se enviaron alertas. El proceso automático publicará aquí cuando una noticia relevante supere el umbral de materialidad."
          }
        />
      ) : (
        <div className="space-y-4">
          {alerts.items.map((notification) => (
            <AlertCard key={notification.id} notification={notification} />
          ))}
        </div>
      )}

      <Pagination
        basePath="/alerts"
        page={alerts.page}
        limit={alerts.limit}
        total={alerts.total}
        extraParams={ticker ? { ticker } : {}}
      />
    </section>
  )
}
