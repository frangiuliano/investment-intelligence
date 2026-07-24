import type { HoldingInput, WatchlistEntryInput } from "@/lib/api/portfolio"
import { HOLDING_ASSET_TYPES } from "@/lib/api/types"
import {
  parseNonNegativeNumber,
  parseOneOf,
  parsePositiveNumber,
  parseTicker,
  readOptionalString,
  readString,
  type ParseResult,
} from "@/lib/forms/parse"

export const HOLDING_QUANTITY_MODES = ["units", "investedAmount"] as const

export type HoldingQuantityMode = (typeof HOLDING_QUANTITY_MODES)[number]

/** Formats a derived unit quantity for API persistence (up to 10 dp). */
export function formatDerivedQuantity(value: number): string {
  if (!Number.isFinite(value) || value <= 0) {
    return ""
  }
  const fixed = value.toFixed(10)
  return fixed.replace(/(\.\d*?[1-9])0+$|\.0+$/, "$1")
}

export function deriveQuantityFromInvestedAmount(
  investedAmountRaw: string,
  avgEntryPriceRaw: string
): ParseResult<string> {
  const investedAmount = parsePositiveNumber(
    investedAmountRaw,
    "El monto invertido"
  )
  if (!investedAmount.ok) {
    return investedAmount
  }

  const priceRaw = avgEntryPriceRaw.trim()
  if (priceRaw === "") {
    return {
      ok: false,
      error:
        "Para cargar por monto, indicá el precio promedio de entrada.",
    }
  }

  const price = Number(priceRaw)
  if (!Number.isFinite(price) || price <= 0) {
    return {
      ok: false,
      error:
        "Para cargar por monto, el precio promedio de entrada debe ser mayor que cero.",
    }
  }

  const quantity = Number(investedAmount.value) / price
  const formatted = formatDerivedQuantity(quantity)
  if (formatted === "") {
    return {
      ok: false,
      error: "No se pudo calcular la cantidad a partir del monto y el precio.",
    }
  }

  return { ok: true, value: formatted }
}

export function estimateAcquisitionCost(
  quantityRaw: string | null | undefined,
  avgEntryPriceRaw: string | null | undefined
): number | null {
  const quantityText = (quantityRaw ?? "").trim()
  const priceText = (avgEntryPriceRaw ?? "").trim()
  if (quantityText === "" || priceText === "") {
    return null
  }

  const quantity = Number(quantityText)
  const price = Number(priceText)
  if (
    !Number.isFinite(quantity) ||
    quantity <= 0 ||
    !Number.isFinite(price) ||
    price < 0
  ) {
    return null
  }
  return quantity * price
}

export function formatAcquisitionCostDisplay(value: number): string {
  if (!Number.isFinite(value)) {
    return "—"
  }
  return formatDerivedQuantity(value) || "0"
}

function resolveQuantityFromForm(
  formData: FormData
): ParseResult<{ quantity: string; avgEntryPrice: string | null }> {
  const modeRaw = readString(formData, "quantityMode")
  const mode: HoldingQuantityMode =
    modeRaw === "" ? "units" : (modeRaw as HoldingQuantityMode)

  if (!(HOLDING_QUANTITY_MODES as readonly string[]).includes(mode)) {
    return {
      ok: false,
      error: 'El modo de carga debe ser "units" o "investedAmount".',
    }
  }

  const avgEntryPrice = parseNonNegativeNumber(
    readString(formData, "avgEntryPrice"),
    "El precio promedio de entrada"
  )
  if (!avgEntryPrice.ok) {
    return avgEntryPrice
  }

  if (mode === "investedAmount") {
    const derived = deriveQuantityFromInvestedAmount(
      readString(formData, "investedAmount"),
      readString(formData, "avgEntryPrice")
    )
    if (!derived.ok) {
      return derived
    }
    return {
      ok: true,
      value: {
        quantity: derived.value,
        avgEntryPrice: avgEntryPrice.value,
      },
    }
  }

  const quantity = parsePositiveNumber(
    readString(formData, "quantity"),
    "La cantidad"
  )
  if (!quantity.ok) {
    return quantity
  }

  return {
    ok: true,
    value: {
      quantity: quantity.value,
      avgEntryPrice: avgEntryPrice.value,
    },
  }
}

export function parseHoldingForm(
  formData: FormData
): ParseResult<HoldingInput> {
  const symbol = parseTicker(readString(formData, "symbol"))
  if (!symbol.ok) {
    return symbol
  }

  const assetType = parseOneOf(
    readString(formData, "assetType"),
    HOLDING_ASSET_TYPES,
    "El tipo de activo"
  )
  if (!assetType.ok) {
    return assetType
  }

  const resolved = resolveQuantityFromForm(formData)
  if (!resolved.ok) {
    return resolved
  }

  const currency = readString(formData, "currency").toUpperCase()
  if (currency !== "" && !/^[A-Z]{3}$/.test(currency)) {
    return {
      ok: false,
      error: "La moneda debe ser un código ISO de 3 letras.",
    }
  }

  return {
    ok: true,
    value: {
      symbol: symbol.value,
      assetType: assetType.value,
      quantity: resolved.value.quantity,
      ...(currency !== "" ? { currency } : {}),
      avgEntryPrice: resolved.value.avgEntryPrice,
      notes: readOptionalString(formData, "notes"),
    },
  }
}

export function parseWatchlistForm(
  formData: FormData
): ParseResult<WatchlistEntryInput> {
  const symbol = parseTicker(readString(formData, "symbol"))
  if (!symbol.ok) {
    return symbol
  }

  return {
    ok: true,
    value: {
      symbol: symbol.value,
      notes: readOptionalString(formData, "notes"),
    },
  }
}
