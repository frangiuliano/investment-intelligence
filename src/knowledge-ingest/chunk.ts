import { DEFAULT_CHUNK_CHARS, DEFAULT_CHUNK_OVERLAP } from './chunk-limits';
import { sha256Hex, shortHash } from './hash';

export type TextChunk = {
  index: number;
  text: string;
  contentHash: string;
  id: string;
};

export type ChunkOptions = {
  maxChars?: number;
  overlap?: number;
};

export function chunkText(
  text: string,
  options: ChunkOptions = {},
): TextChunk[] {
  const maxChars = options.maxChars ?? DEFAULT_CHUNK_CHARS;
  const overlap = options.overlap ?? DEFAULT_CHUNK_OVERLAP;

  if (maxChars < 1) {
    throw new Error('maxChars must be >= 1');
  }
  if (overlap < 0 || overlap >= maxChars) {
    throw new Error('overlap must be >= 0 and < maxChars');
  }

  const normalized = text.replace(/\r\n/g, '\n').trim();
  if (!normalized) {
    return [];
  }

  const chunks: TextChunk[] = [];
  let start = 0;
  let index = 0;

  while (start < normalized.length) {
    let end = Math.min(start + maxChars, normalized.length);

    if (end < normalized.length) {
      const slice = normalized.slice(start, end);
      const breakAt = Math.max(
        slice.lastIndexOf('\n\n'),
        slice.lastIndexOf('\n'),
        slice.lastIndexOf(' '),
      );
      if (breakAt > maxChars * 0.4) {
        end = start + breakAt;
      }
    }

    const chunkTextValue = normalized.slice(start, end).trim();
    if (chunkTextValue.length > 0) {
      const contentHash = sha256Hex(chunkTextValue);
      chunks.push({
        index,
        text: chunkTextValue,
        contentHash,
        id: `chunk-${String(index).padStart(3, '0')}-${shortHash(contentHash)}`,
      });
      index += 1;
    }

    if (end >= normalized.length) {
      break;
    }

    start = Math.max(end - overlap, start + 1);
  }

  return chunks;
}
