import { HypothesisBias } from './entities/hypothesis.entity';

/**
 * Documented stance → journal bias mapping for auto-created hypotheses.
 *
 * | Stance  | Bias     | Rationale                                      |
 * |---------|----------|------------------------------------------------|
 * | enter   | bullish  | Opening / initiating long exposure             |
 * | add     | bullish  | Adding to an existing position                 |
 * | avoid   | bearish  | Stay out / bearish on initiating               |
 * | exit    | bearish  | Exit existing position                         |
 * | reduce  | bearish  | Trim risk / reduce exposure                    |
 * | watch   | watch    | Wait for catalyst; no directional call         |
 * | hold    | watch    | Keep position; no new directional thesis       |
 */
const STANCE_TO_BIAS: Readonly<Record<string, HypothesisBias>> = {
  enter: HypothesisBias.BULLISH,
  add: HypothesisBias.BULLISH,
  avoid: HypothesisBias.BEARISH,
  exit: HypothesisBias.BEARISH,
  reduce: HypothesisBias.BEARISH,
  watch: HypothesisBias.WATCH,
  hold: HypothesisBias.WATCH,
};

export function mapBriefStanceToBias(stance: string): HypothesisBias | null {
  return STANCE_TO_BIAS[stance] ?? null;
}
