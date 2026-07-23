/** Max characters per chunk sent to an LLM extract call. */
export const DEFAULT_CHUNK_CHARS = 3_000;

/** Overlap between consecutive chunks to preserve context at boundaries. */
export const DEFAULT_CHUNK_OVERLAP = 200;

/**
 * Hard cap: never paste more than this many chars into a single LLM call.
 * The skill must send one chunk per extract call.
 */
export const MAX_CHARS_PER_LLM_CALL = DEFAULT_CHUNK_CHARS;
