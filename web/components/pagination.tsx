import { ChevronLeft, ChevronRight } from "lucide-react"
import Link from "next/link"

import { totalPages } from "@/lib/api/query"
import { cn } from "@/lib/utils"

type PaginationProps = {
  basePath: string
  page: number
  limit: number
  total: number
  extraParams?: Record<string, string>
}

function pageHref(
  basePath: string,
  page: number,
  extraParams: Record<string, string>
): string {
  const search = new URLSearchParams(extraParams)
  if (page > 1) {
    search.set("page", String(page))
  }
  const query = search.toString()
  return query ? `${basePath}?${query}` : basePath
}

export function Pagination({
  basePath,
  page,
  limit,
  total,
  extraParams = {},
}: PaginationProps) {
  const pageCount = totalPages(total, limit)
  if (pageCount <= 1) {
    return null
  }

  const linkClasses =
    "flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
  const disabledClasses = "pointer-events-none opacity-40"

  return (
    <nav
      aria-label="Paginación"
      className="mt-6 flex items-center justify-between"
    >
      <Link
        href={pageHref(basePath, page - 1, extraParams)}
        aria-disabled={page <= 1}
        className={cn(linkClasses, page <= 1 && disabledClasses)}
      >
        <ChevronLeft className="size-3.5" />
        Anterior
      </Link>
      <p className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-muted-foreground">
        Página {page} de {pageCount} · {total} en total
      </p>
      <Link
        href={pageHref(basePath, page + 1, extraParams)}
        aria-disabled={page >= pageCount}
        className={cn(linkClasses, page >= pageCount && disabledClasses)}
      >
        Siguiente
        <ChevronRight className="size-3.5" />
      </Link>
    </nav>
  )
}
