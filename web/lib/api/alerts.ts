import "server-only"

import { backendFetch } from "@/lib/api/client"
import { buildListPath, type ListParams } from "@/lib/api/query"
import type { Notification, Paginated } from "@/lib/api/types"

export function listNotifications(
  params: ListParams
): Promise<Paginated<Notification>> {
  return backendFetch<Paginated<Notification>>(
    buildListPath("/notifications", params)
  )
}
