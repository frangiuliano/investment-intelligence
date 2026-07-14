import { UpdateDedupeService } from './update-dedupe.service';

describe('UpdateDedupeService', () => {
  it('claims new update ids and rejects duplicates until complete', () => {
    const dedupe = new UpdateDedupeService();

    expect(dedupe.claim(10)).toBe(true);
    expect(dedupe.claim(10)).toBe(false);

    dedupe.complete(10);
    expect(dedupe.claim(10)).toBe(false);
  });

  it('allows updates without update_id', () => {
    const dedupe = new UpdateDedupeService();
    expect(dedupe.claim(undefined)).toBe(true);
    expect(dedupe.claim(undefined)).toBe(true);
  });
});
