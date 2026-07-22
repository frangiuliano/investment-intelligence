# Rubric: Materiality

- id: `materiality`
- knowledgeVersion: `0.1.0`

Canonical levels used by news analysis: `high` | `medium` | `low`.

## Scale

| Level | Meaning | Typical alert behavior |
|-------|---------|------------------------|
| `high` | Likely to change thesis, cash flows, or risk for a named issuer | Push candidate |
| `medium` | Useful context; may matter with portfolio overlap or cluster | Push if other filters pass |
| `low` | Color / soft signal / weak company hook | Prefer digest; avoid noisy push |

## Decision cues

- Prefer **issuer-specific** + **verifiable** facts over sentiment adjectives.
- Portfolio overlap raises **priority of delivery**, not the materiality label itself.
- When uncertain between two levels, choose the **lower** and state uncertainty.
- Sector/macro pieces without a ticker hook default toward `low`.

## Anti-patterns

- Inflating materiality because the headline is dramatic.
- Using price % move alone as proof of fundamental materiality.
- Mixing several weak rumors into a synthetic `high`.

## source_refs

- seed: scaffold #80
- related playbooks: `playbooks/*.md` materiality tables
