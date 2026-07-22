# Rubric: Stance invalidation

- id: `stance-invalidation`
- knowledgeVersion: `0.1.0`

Guidance for research hypotheses / labeled stances (`enter`, `avoid`, `hold`,
etc.). Stances are **operator research labels**, not broker orders.

## Always define

- What evidence would **invalidate** the stance within a stated horizon.
- What would **confirm** it (so reviews are falsifiable).
- Dependencies: earnings date, catalyst window, credit event, FX band.

## Common invalidators

| Stance context | Invalidation examples |
|----------------|----------------------|
| Thesis on earnings beat | Miss + guidance cut; accounting restatement |
| Avoid on leverage/credit stress | Successful refinance; rating upgrade with stable cash flow |
| Hold through event | Event passes with no thesis change — review may close as neutral |
| CEDEAR vs underlying gap | Gap closes without fundamental change (liquidity/FX only) |
| Duration/rates view on bonds | Policy path reverses; curve move opposite to thesis |

## Review hygiene

- Time-box invalidation checks (e.g. next print, 30/90 days).
- Do not move stance solely because price moved against you without new facts.
- Record whether invalidation came from data, news, or operator judgment.

## Do not

- Present stance changes as execution instructions.
- Invent market levels that were not observed via market-data tools.
- Leave a stance open with no stated invalidation condition.

## source_refs

- seed: scaffold #80
- product note: posture labels from research briefs (#56); review loop (#34)
