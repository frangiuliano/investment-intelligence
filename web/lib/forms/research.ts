import type { HypothesisInput } from "@/lib/api/research"
import { HYPOTHESIS_BIASES } from "@/lib/api/types"
import {
  parseOneOf,
  parsePositiveInteger,
  parseTicker,
  readString,
  type ParseResult,
} from "@/lib/forms/parse"

export function parseHypothesisForm(
  formData: FormData
): ParseResult<HypothesisInput> {
  const symbol = parseTicker(readString(formData, "symbol"))
  if (!symbol.ok) {
    return symbol
  }

  const bias = parseOneOf(
    readString(formData, "bias"),
    HYPOTHESIS_BIASES,
    "El sesgo"
  )
  if (!bias.ok) {
    return bias
  }

  const thesis = readString(formData, "thesis")
  if (thesis === "") {
    return { ok: false, error: "La tesis es obligatoria." }
  }

  const invalidation = readString(formData, "invalidation")
  if (invalidation === "") {
    return { ok: false, error: "La condición de invalidación es obligatoria." }
  }

  const horizonDays = parsePositiveInteger(
    readString(formData, "horizonDays"),
    "El horizonte (días)"
  )
  if (!horizonDays.ok) {
    return horizonDays
  }

  return {
    ok: true,
    value: {
      symbol: symbol.value,
      bias: bias.value,
      thesis,
      invalidation,
      horizonDays: horizonDays.value,
    },
  }
}
