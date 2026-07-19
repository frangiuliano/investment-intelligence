import { CircleAlert } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"

export function EmptyState({ message }: { message: string }) {
  return (
    <Card className="border-dashed bg-paper/60">
      <CardContent className="py-10 text-center">
        <p className="text-sm text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
  )
}

export function ErrorState({ message }: { message: string }) {
  return (
    <Card className="border-destructive/20 bg-destructive/5">
      <CardContent className="flex items-start gap-3 py-6">
        <CircleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
        <div>
          <p className="text-sm font-medium text-destructive">
            No se pudo conectar con el servicio de datos
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{message}</p>
        </div>
      </CardContent>
    </Card>
  )
}

export function LoadingState({ label }: { label: string }) {
  return (
    <section aria-busy="true">
      <div className="mb-10 border-b border-ink/10 pb-6">
        <div className="h-3 w-40 animate-pulse rounded bg-muted" />
        <div className="mt-4 h-10 w-64 animate-pulse rounded bg-muted" />
      </div>
      <div className="space-y-3">
        <div className="h-24 animate-pulse rounded-xl bg-muted/70" />
        <div className="h-24 animate-pulse rounded-xl bg-muted/50" />
      </div>
      <p className="sr-only">{label}</p>
    </section>
  )
}
