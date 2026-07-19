"use client"

import { useActionState } from "react"

import { ActionMessage, SubmitButton } from "@/components/form-feedback"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { WatchlistEntry } from "@/lib/api/types"
import { idleActionState } from "@/lib/forms/action-state"
import { formatDate } from "@/lib/display"

import {
  createWatchlistEntryAction,
  deleteWatchlistEntryAction,
} from "./actions"

function WatchlistRow({ entry }: { entry: WatchlistEntry }) {
  const [deleteState, deleteFormAction] = useActionState(
    deleteWatchlistEntryAction,
    idleActionState
  )

  return (
    <TableRow>
      <TableCell className="font-mono text-xs font-semibold">
        {entry.symbol}
      </TableCell>
      <TableCell className="max-w-72 truncate text-muted-foreground">
        {entry.notes ?? "—"}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {formatDate(entry.createdAt)}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-2">
          <form
            action={deleteFormAction}
            onSubmit={(event) => {
              if (
                !window.confirm(`Remove ${entry.symbol} from the watchlist?`)
              ) {
                event.preventDefault()
              }
            }}
          >
            <input type="hidden" name="id" value={entry.id} />
            <SubmitButton variant="destructive" size="sm" pendingLabel="…">
              Remove
            </SubmitButton>
          </form>
          <ActionMessage state={deleteState} />
        </div>
      </TableCell>
    </TableRow>
  )
}

export function WatchlistSection({ entries }: { entries: WatchlistEntry[] }) {
  const [createState, createFormAction] = useActionState(
    createWatchlistEntryAction,
    idleActionState
  )

  return (
    <div className="space-y-5">
      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          The watchlist is empty. Add a symbol to weight it in relevance
          scoring.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Symbol</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead>Added</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => (
              <WatchlistRow key={entry.id} entry={entry} />
            ))}
          </TableBody>
        </Table>
      )}

      <form action={createFormAction} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="watchlist-symbol">Symbol</Label>
            <Input
              id="watchlist-symbol"
              name="symbol"
              placeholder="NVDA"
              required
              className="uppercase"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="watchlist-notes">Notes</Label>
            <Input id="watchlist-notes" name="notes" placeholder="Optional" />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <SubmitButton pendingLabel="Adding…">Add to watchlist</SubmitButton>
          <ActionMessage state={createState} />
        </div>
      </form>
    </div>
  )
}
