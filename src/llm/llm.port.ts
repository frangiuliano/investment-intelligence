import {
  LlmCompleteJsonRequest,
  LlmCompleteJsonResult,
} from './llm.types';

export const LLM_CLIENT = Symbol('LLM_CLIENT');

/**
 * Application port for structured (JSON) LLM completions.
 * Domain modules depend on this — never on a vendor SDK.
 */
export interface LlmClient {
  completeJson(
    request: LlmCompleteJsonRequest,
  ): Promise<LlmCompleteJsonResult>;
}
