export type AssetSuggestErrorReason =
  'provider_error' | 'timeout' | 'invalid_response';

export class AssetSuggestUnavailableError extends Error {
  readonly reason: AssetSuggestErrorReason;
  readonly statusCode?: number;

  constructor(
    reason: AssetSuggestErrorReason,
    message: string,
    statusCode?: number,
  ) {
    super(message);
    this.name = 'AssetSuggestUnavailableError';
    this.reason = reason;
    this.statusCode = statusCode;
  }
}
