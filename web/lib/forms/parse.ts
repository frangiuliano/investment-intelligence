export type ParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string }

export function readString(formData: FormData, field: string): string {
  const value = formData.get(field)
  return typeof value === "string" ? value.trim() : ""
}

export function readOptionalString(
  formData: FormData,
  field: string
): string | null {
  const value = readString(formData, field)
  return value.length > 0 ? value : null
}

const TICKER_PATTERN = /^[A-Z0-9.\-^]{1,12}$/

export function parseTicker(raw: string): ParseResult<string> {
  const ticker = raw.trim().toUpperCase()
  if (!TICKER_PATTERN.test(ticker)) {
    return {
      ok: false,
      error: 'Ticker must be 1-12 characters (letters, digits, ".", "-", "^").',
    }
  }
  return { ok: true, value: ticker }
}

export function parsePositiveNumber(
  raw: string,
  label: string
): ParseResult<string> {
  const value = raw.trim()
  const parsed = Number(value)
  if (value === "" || !Number.isFinite(parsed) || parsed <= 0) {
    return { ok: false, error: `${label} must be a number greater than zero.` }
  }
  return { ok: true, value }
}

export function parseNonNegativeNumber(
  raw: string,
  label: string
): ParseResult<string | null> {
  const value = raw.trim()
  if (value === "") {
    return { ok: true, value: null }
  }
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0) {
    return { ok: false, error: `${label} must be zero or a positive number.` }
  }
  return { ok: true, value }
}

export function parsePositiveInteger(
  raw: string,
  label: string
): ParseResult<number> {
  const parsed = Number(raw.trim())
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return { ok: false, error: `${label} must be a whole number above zero.` }
  }
  return { ok: true, value: parsed }
}

export function parseOneOf<T extends string>(
  raw: string,
  allowed: readonly T[],
  label: string
): ParseResult<T> {
  if ((allowed as readonly string[]).includes(raw)) {
    return { ok: true, value: raw as T }
  }
  return { ok: false, error: `${label} must be one of: ${allowed.join(", ")}.` }
}
