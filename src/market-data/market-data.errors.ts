export type MarketDataErrorReason =
  | 'invalid_symbol'
  | 'not_found'
  | 'provider_error'
  | 'timeout'
  | 'invalid_response';

export class MarketDataUnavailableError extends Error {
  constructor(
    readonly symbol: string,
    readonly reason: MarketDataErrorReason,
    message: string,
    readonly statusCode?: number,
  ) {
    super(message);
    this.name = 'MarketDataUnavailableError';
  }
}
