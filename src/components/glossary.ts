/**
 * Terms used across the status and pool pages (#20), defined once and linked from where each
 * first appears so a reader never has to guess at jargon. Rendered as the Method page's
 * Glossary section; `GLOSSARY_ORDER` is display order, not alphabetical, so related terms
 * (the clamp's three rates, then the cost gate, then the two scoring inputs) sit together.
 */
export type GlossaryKey =
  | 'raw'
  | 'quote'
  | 'anchor'
  | 'clamp'
  | 'policy-rate'
  | 'tight-rate'
  | 'cost-gate'
  | 'evidence'
  | 'exposure'
  | 'cost-to-move'
  | 'deviation-guard';

export const GLOSSARY: Record<GlossaryKey, { term: string; definition: string }> = {
  raw: {
    term: 'Raw median',
    definition: "The median of the upstream feeds' prices, before the clamp is applied. What the market says right now.",
  },
  quote: {
    term: 'Quote',
    definition: 'What a pool actually reads from the oracle (lastprice): the raw median after the clamp limits how far it can move from the anchor.',
  },
  anchor: {
    term: 'Anchor',
    definition: "The oracle's last on-chain reference price. The clamp measures every new quote against this, and the keeper moves it (pokes it) towards the raw median at the policy rate.",
  },
  clamp: {
    term: 'Clamp',
    definition: "The oracle's own rate limit: a quote can move away from the anchor by at most the current rate (policy, or the tight rate under the cost gate) per hour, however far the raw median has moved.",
  },
  'policy-rate': {
    term: 'Policy rate',
    definition: "The clamp's normal speed limit, in percent per hour, set per asset and per direction (up/down). A real, sustained price move still gets through at this rate; a sudden spike does not move the quote all at once.",
  },
  'tight-rate': {
    term: 'Tight rate',
    definition: 'A slower clamp speed the cost gate switches to when market evidence is missing or stale, so an attacker gets less benefit from timing a move around a gap in evidence.',
  },
  'cost-gate': {
    term: 'Cost gate',
    definition: "Keeps the normal policy rate only while fresh market evidence shows moving the price would cost at least a set multiple of what it would unlock; otherwise the oracle falls back to the tight rate.",
  },
  evidence: {
    term: 'Evidence',
    definition: "The cost and exposure figures the keeper last published on-chain for the cost gate to check, read from the same order-book analysis as the scan. Evidence older than the gate's limit counts as missing.",
  },
  exposure: {
    term: 'Exposure',
    definition: 'What an attacker could borrow once a price is false: the other reserves’ available liquidity (collateral side) or this reserve’s own (debt side).',
  },
  'cost-to-move': {
    term: 'Cost to move',
    definition: "The capital needed to clear the public order book up to a 10× price move — the capital an attacker would need, not the pool's loss.",
  },
  'deviation-guard': {
    term: 'Deviation guard',
    definition: "A separate check some price aggregators run: it rejects an upstream round that moved more than a set percent since the previous one. “off” means the pool has no such protection.",
  },
};

export const GLOSSARY_ORDER: GlossaryKey[] = [
  'raw',
  'quote',
  'anchor',
  'clamp',
  'policy-rate',
  'tight-rate',
  'cost-gate',
  'evidence',
  'exposure',
  'cost-to-move',
  'deviation-guard',
];
