import {
  BRIEF_STANCES_NO_HOLDING,
  BRIEF_STANCES_WITH_HOLDING,
  BriefStance,
} from './brief.types';

export function allowedStancesForHolding(
  hasHolding: boolean,
): readonly BriefStance[] {
  return hasHolding ? BRIEF_STANCES_WITH_HOLDING : BRIEF_STANCES_NO_HOLDING;
}

export function isBriefStance(value: unknown): value is BriefStance {
  return (
    typeof value === 'string' &&
    (
      [...BRIEF_STANCES_NO_HOLDING, ...BRIEF_STANCES_WITH_HOLDING] as string[]
    ).includes(value)
  );
}

export function validateStanceForHolding(
  stance: BriefStance | null,
  hasHolding: boolean,
): BriefStance | null {
  if (!stance) {
    return null;
  }
  const allowed = allowedStancesForHolding(hasHolding);
  return (allowed as readonly string[]).includes(stance) ? stance : null;
}
