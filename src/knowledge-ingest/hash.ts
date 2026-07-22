import { createHash } from 'node:crypto';

export function sha256Hex(content: string | Buffer): string {
  return createHash('sha256').update(content).digest('hex');
}

export function shortHash(hex: string, length = 12): string {
  return hex.slice(0, length);
}
