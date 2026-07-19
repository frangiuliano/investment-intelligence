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
    "Asset type"
  )
  if (!assetType.ok) {
    return assetType
  }

  const quantity = parsePositiveNumber(
    readString(formData, "quantity"),
    "Quantity"
  )
  if (!quantity.ok) {
    return quantity
  }

  const avgEntryPrice = parseNonNegativeNumber(
    readString(formData, "avgEntryPrice"),
    "Average entry price"
  )
  if (!avgEntryPrice.ok) {
    return avgEntryPrice
  }

  const currency = readString(formData, "currency").toUpperCase()
  if (currency !== "" && !/^[A-Z]{3}$/.test(currency)) {
    return { ok: false, error: "Currency must be a 3-letter ISO code." }
  }

  return {
    ok: true,
    value: {
      symbol: symbol.value,
      assetType: assetType.value,
      quantity: quantity.value,
      ...(currency !== "" ? { currency } : {}),
      avgEntryPrice: avgEntryPrice.value,
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
