# Playbook draft: Order Blocks (Bryan López) → equity

- id: `equity`
- assetType: `equity`
- knowledgeVersion: `0.1.4` (pending Accept)
- docId: `order-blocks-bryan-lopez-fcdaecc0`
- genre: `technical_analysis` (filter-themes.json v1.0.0)

Merged extract method only. Maps SMC / order-block language to **research lens
and invalidation**, never to broker entries.

## Always check

- If a source cites an order block / mitigation / breaker: require verified OHLC
  structure and state trend context (HTF premise) before echoing the label.
- Classify bullish vs bearish block by the last opposing candle before the
  alleged impulse; note competing stories (re-offer vs mitigation unwind).
- Keep news materiality on company/catalyst facts; treat OB jargon as technical
  color unless attached to a real event.

## Materiality heuristics

| Signal | Suggested materiality | Notes |
|--------|----------------------|-------|
| Headline only names order block / ICT / mitigation / breaker | low | Chart jargon ≠ catalyst |
| OB used as sole upgrade to alert priority | low | Educational lens only |
| Verified structure + HTF trend + company catalyst | low–medium | Technical context; fundamentals still lead |
| Certainty language (“rebote asegurado”) around a zone | low | Process smell |
| Motivational / magic-formula framing | low | Ignore for alerts |

## Invalidation

- Wrong candle / no impulsive follow-through / unverified bars.
- Post-hoc rename of the zone after a conflicting print (double top, failed bounce).
- Mitigation story fits better and was ignored.
- HTF vs LTF labels disagree without disclosure.
- Block treated as always-valid despite source admitting failures.

## Do not

- Map “entrada / R:R / comprar el open del bloque” into product orders.
- Invent institutional intent, order-flow, or pip counts.
- Promote OB / mitigation / breaker to `event_type`.
- Keep certainty or sales copy from the PDF in injectable bullets.

## source_refs

- operator: `sources/Order Blocks Bryan Lopez.pdf` (docId `order-blocks-bryan-lopez-fcdaecc0`)
- ranking: `technical_analysis` via `filter-themes.json` v1.0.0 (`selected-chunks.json`)
- extracts: `raw/order-blocks-bryan-lopez-fcdaecc0/extracts/`
