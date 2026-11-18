import { TIER_LABEL, TIER_MEANING } from '../derive';
import type { Tier } from '../types';
import { TierIcon } from './icons';

export function TierBadge({ tier }: { tier: Tier }) {
  return (
    <span className="tier" data-tier={tier} title={TIER_MEANING[tier]}>
      <TierIcon tier={tier} />
      {TIER_LABEL[tier]}
    </span>
  );
}
