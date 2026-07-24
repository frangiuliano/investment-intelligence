import { HypothesisBias } from './entities/hypothesis.entity';
import { mapBriefStanceToBias } from './brief-stance-to-bias';

describe('mapBriefStanceToBias', () => {
  it.each([
    ['enter', HypothesisBias.BULLISH],
    ['add', HypothesisBias.BULLISH],
    ['avoid', HypothesisBias.BEARISH],
    ['exit', HypothesisBias.BEARISH],
    ['reduce', HypothesisBias.BEARISH],
    ['watch', HypothesisBias.WATCH],
    ['hold', HypothesisBias.WATCH],
  ] as const)('maps %s → %s', (stance, bias) => {
    expect(mapBriefStanceToBias(stance)).toBe(bias);
  });

  it('returns null for unknown stance values', () => {
    expect(mapBriefStanceToBias('buy')).toBeNull();
    expect(mapBriefStanceToBias('')).toBeNull();
  });
});
