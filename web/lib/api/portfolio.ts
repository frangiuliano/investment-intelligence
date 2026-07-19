import "server-only"

import { backendFetch } from "@/lib/api/client"
import type { Holding, WatchlistEntry } from "@/lib/api/types"

export type HoldingInput = {
  symbol?: string
  assetType?: string
  quantity?: string
  currency?: string
  avgEntryPrice?: string | null
  notes?: string | null
}

export function listHoldings(): Promise<Holding[]> {
  return backendFetch<Holding[]>("/holdings")
}

export function createHolding(input: HoldingInput): Promise<Holding> {
  return backendFetch<Holding>("/holdings", { method: "POST", body: input })
}

export function updateHolding(
  id: string,
  input: HoldingInput
): Promise<Holding> {
  return backendFetch<Holding>(`/holdings/${id}`, {
    method: "PATCH",
    body: input,
  })
}

export function deleteHolding(id: string): Promise<void> {
  return backendFetch<void>(`/holdings/${id}`, { method: "DELETE" })
}

export type WatchlistEntryInput = {
  symbol?: string
  notes?: string | null
}

export function listWatchlist(): Promise<WatchlistEntry[]> {
  return backendFetch<WatchlistEntry[]>("/watchlist")
}

export function createWatchlistEntry(
  input: WatchlistEntryInput
): Promise<WatchlistEntry> {
  return backendFetch<WatchlistEntry>("/watchlist", {
    method: "POST",
    body: input,
  })
}

export function deleteWatchlistEntry(id: string): Promise<void> {
  return backendFetch<void>(`/watchlist/${id}`, { method: "DELETE" })
}
