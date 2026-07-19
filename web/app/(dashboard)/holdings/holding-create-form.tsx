"use client"

import { useActionState } from "react"

import { ActionMessage, SubmitButton } from "@/components/form-feedback"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect } from "@/components/ui/select"
import { HOLDING_ASSET_TYPES } from "@/lib/api/types"
import { assetTypeLabel } from "@/lib/display"
import { idleActionState } from "@/lib/forms/action-state"

import { createHoldingAction } from "./actions"

export function HoldingCreateForm() {
  const [state, formAction] = useActionState(
    createHoldingAction,
    idleActionState
  )

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2">
          <Label htmlFor="holding-symbol">Símbolo</Label>
          <Input
            id="holding-symbol"
            name="symbol"
            placeholder="AAPL"
            required
            className="uppercase"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="holding-asset-type">Tipo de activo</Label>
          <NativeSelect id="holding-asset-type" name="assetType" required>
            {HOLDING_ASSET_TYPES.map((assetType) => (
              <option key={assetType} value={assetType}>
                {assetTypeLabel(assetType)}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <Label htmlFor="holding-quantity">Cantidad</Label>
          <Input
            id="holding-quantity"
            name="quantity"
            type="number"
            step="any"
            min="0"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="holding-avg-entry">Precio promedio de entrada</Label>
          <Input
            id="holding-avg-entry"
            name="avgEntryPrice"
            type="number"
            step="any"
            min="0"
            placeholder="Opcional"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="holding-currency">Moneda</Label>
          <Input
            id="holding-currency"
            name="currency"
            placeholder="USD"
            maxLength={3}
            className="uppercase"
          />
        </div>
        <div className="space-y-2 sm:col-span-2 lg:col-span-3">
          <Label htmlFor="holding-notes">Notas</Label>
          <Input id="holding-notes" name="notes" placeholder="Opcional" />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <SubmitButton pendingLabel="Agregando…">Agregar posición</SubmitButton>
        <ActionMessage state={state} />
      </div>
    </form>
  )
}
