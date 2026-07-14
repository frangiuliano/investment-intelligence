import { Injectable } from '@nestjs/common';

const MAX_SEEN_UPDATE_IDS = 1_000;

/**
 * In-memory dedupe for Telegram webhook retries (single process).
 * SOLID: Single Responsibility — track seen/in-flight update_ids only.
 */
@Injectable()
export class UpdateDedupeService {
  private readonly seen = new Set<number>();
  private readonly inFlight = new Set<number>();
  private readonly order: number[] = [];

  /**
   * @returns true if this update should be processed (claimed for processing)
   */
  claim(updateId: number | undefined): boolean {
    if (updateId === undefined || !Number.isFinite(updateId)) {
      return true;
    }
    if (this.seen.has(updateId) || this.inFlight.has(updateId)) {
      return false;
    }
    this.inFlight.add(updateId);
    return true;
  }

  complete(updateId: number | undefined): void {
    if (updateId === undefined || !Number.isFinite(updateId)) {
      return;
    }
    this.inFlight.delete(updateId);
    if (this.seen.has(updateId)) {
      return;
    }
    this.seen.add(updateId);
    this.order.push(updateId);
    while (this.order.length > MAX_SEEN_UPDATE_IDS) {
      const oldest = this.order.shift();
      if (oldest !== undefined) {
        this.seen.delete(oldest);
      }
    }
  }
}
