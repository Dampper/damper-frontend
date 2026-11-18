import type { PriceSource, Reserve } from '../types';

export function sourceLabel(s: PriceSource): string {
  if (s.isBaseAsset) return 'Fixed $1';
  switch (s.upstreamKind) {
    case 'reflector-dex':
      return 'Reflector DEX feed';
    case 'reflector-cex':
      return 'Reflector CEX feed';
    case 'operator-feed':
      return 'Admin-run feed';
    default:
      return 'Other feed';
  }
}

export function sourceLabels(reserves: Reserve[]): string[] {
  return [...new Set(reserves.map((r) => sourceLabel(r.source)))];
}

export function deviationGuard(s: PriceSource): string {
  if (s.maxDevPct === undefined) return '—';
  if (s.maxDevPct === 0 || s.maxDevPct >= 100) return 'off';
  return `${s.maxDevPct}% per round`;
}
