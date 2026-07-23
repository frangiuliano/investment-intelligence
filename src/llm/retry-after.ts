export function parseRetryAfterMs(
  body: string,
  headerValue: string | null | undefined,
): number | undefined {
  if (headerValue) {
    const seconds = Number(headerValue.trim());
    if (Number.isFinite(seconds) && seconds >= 0) {
      return Math.ceil(seconds * 1000);
    }
  }

  const match = body.match(/retry in\s+([\d.]+)\s*s/i);
  if (!match) {
    return undefined;
  }

  const seconds = Number(match[1]);
  if (!Number.isFinite(seconds) || seconds < 0) {
    return undefined;
  }

  return Math.ceil(seconds * 1000);
}
