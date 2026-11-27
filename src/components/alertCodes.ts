/**
 * What each alert code the keeper can raise for an asset means and what an operator usually
 * does about it (#23). Every code `decide()` emits into `AssetStatus.alerts`
 * (damper-backend's `src/keeper/decide.ts`) is covered; an unrecognized code (the frontend
 * running ahead of a backend that added one) falls back to a generic entry instead of
 * breaking.
 */
export interface AlertCodeInfo {
  explanation: string;
  response: string;
}

export const ALERT_CODES: Record<string, AlertCodeInfo> = {
  'no-policy': {
    explanation: 'This asset has no clamp policy set, so the oracle returns the raw upstream median with no protection at all.',
    response: 'Expected until an operator sets a policy for this asset. Set one before relying on its price.',
  },
  unseeded: {
    explanation: 'A policy is set, but the anchor was never seeded, so the oracle returns no price for this asset yet.',
    response: 'An operator needs to seed the anchor (an admin action) before this price is usable.',
  },
  'no-quote': {
    explanation: 'Too few upstream feeds are fresh, or all of them are stale, so the oracle cannot produce a price right now.',
    response: "Check the upstream feeds' health. This asset has no usable price until enough of them report again.",
  },
  'anchor-stale': {
    explanation: 'The anchor has not moved for longer than its clamp window, so the quote may be lagging what the market is doing.',
    response: 'Usually clears on the next keeper pass. If it persists, check that the keeper is still running.',
  },
  'clamp-binding': {
    explanation: 'Upstream feeds disagree with what pools currently read. Either a real move is being rate-limited by the clamp, or someone is pushing the price.',
    response: 'Compare the raw median against the quote. If the raw price keeps diverging further, expect a suspicious-move alert next.',
  },
  'suspicious-move': {
    explanation: "The raw price sits far enough from the anchor that the keeper is holding pokes rather than moving towards it immediately, in case it's manipulation rather than a real move.",
    response: "Check what moved the upstream market during the hold. A genuine, sustained move still goes through once the hold period ends (watch for hold-expired).",
  },
  'hold-expired': {
    explanation: 'A price move this far from the anchor has now lasted through the entire hold period, so the keeper resumes poking even though it still looks like manipulation.',
    response: 'Look at the upstream markets directly: a real crash and a very patient attacker look identical to the oracle at this point, so this needs a human judgment call.',
  },
  'evidence-stale': {
    explanation: "No fresh market-cost evidence has been published for this asset, so the cost gate has switched it to its slower tight rate.",
    response: "Usually clears once the keeper publishes fresh evidence on its next pass. If it persists, check that evidence publishing is running.",
  },
  'gate-tight': {
    explanation: 'Fresh evidence shows the market is currently cheap enough to manipulate for this direction (below the cost gate’s minimum ratio), so it is held to the tight rate.',
    response: 'Expected in a thin or temporarily illiquid market. Clears once the market provides enough depth for fresh evidence to clear the gate again.',
  },
};

const UNKNOWN_ALERT_CODE: AlertCodeInfo = {
  explanation: 'This alert code is not yet documented here.',
  response: 'Check damper-backend’s src/keeper/decide.ts for what raised it.',
};

export function alertCodeInfo(code: string): AlertCodeInfo {
  return ALERT_CODES[code] ?? UNKNOWN_ALERT_CODE;
}
