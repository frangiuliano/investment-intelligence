"use client"

import { useActionState, useState } from "react"

import { ActionMessage, SubmitButton } from "@/components/form-feedback"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect } from "@/components/ui/select"
import { TableCell, TableRow } from "@/components/ui/table"
import { HOLDING_ASSET_TYPES, type Holding } from "@/lib/api/types"
import { assetTypeLabel } from "@/lib/display"
import { idleActionState } from "@/lib/forms/action-state"

import { deleteHoldingAction, updateHoldingAction } from "./actions"

export function HoldingRow({ holding }: { holding: Holding }) {
  const [isEditing, setIsEditing] = useState(false)
  const [updateState, updateFormAction] = useActionState(
    updateHoldingAction,
    idleActionState
  )
  const [deleteState, deleteFormAction] = useActionState(
    deleteHoldingAction,
    idleActionState
  )

  if (isEditing) {
    return (
      <TableRow>
        <TableCell colSpan={7} className="bg-muted/30">
          <form action={updateFormAction} className="space-y-4 py-2">
            <input type="hidden" name="id" value={holding.id} />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor={`edit-symbol-${holding.id}`}>Símbolo</Label>
                <Input
                  id={`edit-symbol-${holding.id}`}
                  name="symbol"
                  defaultValue={holding.symbol}
                  required
                  className="uppercase"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`edit-asset-type-${holding.id}`}>
                  Tipo de activo
                </Label>
                <NativeSelect
                  id={`edit-asset-type-${holding.id}`}
                  name="assetType"
                  defaultValue={holding.assetType}
                  required
                >
                  {HOLDING_ASSET_TYPES.map((assetType) => (
                    <option key={assetType} value={assetType}>
                      {assetTypeLabel(assetType)}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-2">
                <Label htmlFor={`edit-quantity-${holding.id}`}>Cantidad</Label>
                <Input
                  id={`edit-quantity-${holding.id}`}
                  name="quantity"
                  type="number"
                  step="any"
                  min="0"
                  defaultValue={holding.quantity}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`edit-avg-entry-${holding.id}`}>
                  Precio promedio de entrada
                </Label>
                <Input
                  id={`edit-avg-entry-${holding.id}`}
                  name="avgEntryPrice"
                  type="number"
                  step="any"
                  min="0"
                  defaultValue={holding.avgEntryPrice ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`edit-currency-${holding.id}`}>Moneda</Label>
                <Input
                  id={`edit-currency-${holding.id}`}
                  name="currency"
                  defaultValue={holding.currency}
                  maxLength={3}
                  className="uppercase"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`edit-notes-${holding.id}`}>Notas</Label>
                <Input
                  id={`edit-notes-${holding.id}`}
                  name="notes"
                  defaultValue={holding.notes ?? ""}
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <SubmitButton size="sm" pendingLabel="Guardando…">
                Guardar cambios
              </SubmitButton>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(false)}
              >
                Cancelar
              </Button>
              <ActionMessage state={updateState} />
            </div>
          </form>
        </TableCell>
      </TableRow>
    )
  }

  return (
    <TableRow>
      <TableCell className="font-mono text-xs font-semibold">
        {holding.symbol}
      </TableCell>
      <TableCell>
        <Badge>{assetTypeLabel(holding.assetType)}</Badge>
      </TableCell>
      <TableCell className="font-mono text-xs">{holding.quantity}</TableCell>
      <TableCell className="font-mono text-xs">
        {holding.avgEntryPrice ?? "—"}
      </TableCell>
      <TableCell className="font-mono text-xs">{holding.currency}</TableCell>
      <TableCell className="max-w-56 truncate text-muted-foreground">
        {holding.notes ?? "—"}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(true)}
          >
            Editar
          </Button>
          <form
            action={deleteFormAction}
            onSubmit={(event) => {
              if (!window.confirm(`¿Eliminar ${holding.symbol} de la cartera?`)) {
                event.preventDefault()
              }
            }}
          >
            <input type="hidden" name="id" value={holding.id} />
            <SubmitButton variant="destructive" size="sm" pendingLabel="…">
              Eliminar
            </SubmitButton>
          </form>
          <ActionMessage state={deleteState} />
        </div>
      </TableCell>
    </TableRow>
  )
}
