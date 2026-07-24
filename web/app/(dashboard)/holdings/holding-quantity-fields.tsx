"use client"

import { useId, useState } from "react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  estimateAcquisitionCost,
  formatAcquisitionCostDisplay,
  type HoldingQuantityMode,
} from "@/lib/forms/portfolio"
import { cn } from "@/lib/utils"

type HoldingQuantityFieldsProps = {
  idPrefix: string
  defaultQuantity?: string
  defaultAvgEntryPrice?: string
  className?: string
}

export function HoldingQuantityFields({
  idPrefix,
  defaultQuantity = "",
  defaultAvgEntryPrice = "",
  className,
}: HoldingQuantityFieldsProps) {
  const generatedId = useId()
  const prefix = idPrefix || generatedId
  const [mode, setMode] = useState<HoldingQuantityMode>("units")
  const [quantity, setQuantity] = useState(defaultQuantity)
  const [investedAmount, setInvestedAmount] = useState("")
  const [avgEntryPrice, setAvgEntryPrice] = useState(defaultAvgEntryPrice)

  const estimatedCost =
    mode === "investedAmount"
      ? Number.isFinite(Number(investedAmount)) && Number(investedAmount) > 0
        ? Number(investedAmount)
        : null
      : estimateAcquisitionCost(quantity, avgEntryPrice)

  return (
    <div className={cn("contents", className)}>
      <div className="space-y-2 sm:col-span-2 lg:col-span-4">
        <p className="text-sm font-medium">Modo de carga</p>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="quantityMode"
              value="units"
              checked={mode === "units"}
              onChange={() => setMode("units")}
            />
            Por unidades
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="quantityMode"
              value="investedAmount"
              checked={mode === "investedAmount"}
              onChange={() => setMode("investedAmount")}
            />
            Por monto invertido
          </label>
        </div>
        <p className="text-xs text-muted-foreground">
          La cantidad que se guarda son unidades del activo (admite
          decimales, p. ej. 12.5). El monto invertido solo ayuda a
          calcularlas; no se persiste aparte.
        </p>
      </div>

      {mode === "units" ? (
        <div className="space-y-2">
          <Label htmlFor={`${prefix}-quantity`}>
            Cantidad (unidades del activo)
          </Label>
          <Input
            id={`${prefix}-quantity`}
            name="quantity"
            type="number"
            step="any"
            min="0"
            required
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            placeholder="p. ej. 12.5"
          />
          <p className="text-xs text-muted-foreground">
            Unidades del título o contrato, no el monto en moneda.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor={`${prefix}-invested-amount`}>Monto invertido</Label>
          <Input
            id={`${prefix}-invested-amount`}
            name="investedAmount"
            type="number"
            step="any"
            min="0"
            required
            value={investedAmount}
            onChange={(event) => setInvestedAmount(event.target.value)}
            placeholder="p. ej. 1000"
          />
          <p className="text-xs text-muted-foreground">
            Se divide por el precio de entrada para obtener las unidades.
          </p>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor={`${prefix}-avg-entry`}>
          Precio promedio de entrada
          {mode === "investedAmount" ? " (requerido)" : ""}
        </Label>
        <Input
          id={`${prefix}-avg-entry`}
          name="avgEntryPrice"
          type="number"
          step="any"
          min="0"
          required={mode === "investedAmount"}
          value={avgEntryPrice}
          onChange={(event) => setAvgEntryPrice(event.target.value)}
          placeholder={mode === "investedAmount" ? undefined : "Opcional"}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${prefix}-estimated-cost`}>
          Costo de adquisición estimado
        </Label>
        <Input
          id={`${prefix}-estimated-cost`}
          type="text"
          readOnly
          tabIndex={-1}
          value={
            estimatedCost === null
              ? "—"
              : formatAcquisitionCostDisplay(estimatedCost)
          }
          className="font-mono text-xs text-muted-foreground"
          aria-live="polite"
        />
        <p className="text-xs text-muted-foreground">
          Calculado como unidades × precio de entrada. No se guarda como
          campo aparte.
        </p>
      </div>
    </div>
  )
}
