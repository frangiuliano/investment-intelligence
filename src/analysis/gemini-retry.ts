export { parseRetryAfterMs } from '../llm/retry-after';

export function resolveRetryDelayMs(input: {
  attempt: number;
  baseMs: number;
  retryAfterMs?: number;
  maxMs: number;
}): number {
  const exponential = input.baseMs * 2 ** (input.attempt - 1);
  const requested = Math.max(exponential, input.retryAfterMs ?? 0);
  return Math.min(requested, input.maxMs);
}
