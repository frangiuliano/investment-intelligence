export type LlmCompleteJsonRequest = {
  system: string;
  user: string;
  /** Optional prompt/schema version for tracing (not sent to the provider). */
  schemaVersion?: string;
  temperature?: number;
  maxOutputTokens?: number;
  timeoutMs?: number;
};

export type LlmCompleteJsonResult = {
  text: string;
  provider: string;
  model: string;
};
