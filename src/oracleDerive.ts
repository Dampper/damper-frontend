import { trim } from './format';
import type { AssetStatus, OracleStatus, Rate } from './types';

/** Matches the contract's `UNBOUNDED` (`u32::MAX`): this direction has no clamp at all. */
export const UNBOUNDED = 4_294_967_295;

/** '15%/h', '1.5%/h', 'unbounded'. */
export function rateLabel(bpsPerHour: number): string {
  if (bpsPerHour >= UNBOUNDED) return 'unbounded';
  return `${trim(bpsPerHour / 100, 2)}%/h`;
}

/** '10×', '2×' from basis points (10,000 = 1×). */
export function costRatioLabel(minCostRatioBps: number): string {
  return `${trim(minCostRatioBps / 10_000, 1)}×`;
}

/** The i128 fixed-point amount as a plain number, for display formatting (format.ts). */
export function fixedToNumber(v: bigint | undefined, decimals: number | undefined): number | undefined {
  if (v === undefined || decimals === undefined) return undefined;
  return Number(v) / 10 ** decimals;
}

export function anchorAgeSecs(asset: AssetStatus, now: number): number | undefined {
  return asset.anchor ? Math.max(0, now - asset.anchor.timestamp) : undefined;
}

/** True when the gate has pulled a bounded direction below its policy rate right now. */
export function isTightened(asset: AssetStatus): boolean {
  if (!asset.policy || !asset.effectivePolicy) return false;
  return asset.effectivePolicy.upBpsPerHour < asset.policy.upBpsPerHour || asset.effectivePolicy.downBpsPerHour < asset.policy.downBpsPerHour;
}

export function evidenceAgeSecs(asset: AssetStatus, now: number): number | undefined {
  return asset.evidence ? Math.max(0, now - asset.evidence.timestamp) : undefined;
}

export const SEVERITY_ORDER: Array<AssetStatus['alerts'][number]['severity']> = ['critical', 'warn', 'info'];
export function severityRank(s: AssetStatus['alerts'][number]['severity']): number {
  return SEVERITY_ORDER.indexOf(s);
}

/** Worst alert severity across every asset, or undefined when the oracle has raised nothing. */
export function worstSeverity(status: OracleStatus): AssetStatus['alerts'][number]['severity'] | undefined {
  let worst: AssetStatus['alerts'][number]['severity'] | undefined;
  for (const a of status.assets) for (const alert of a.alerts) if (!worst || severityRank(alert.severity) < severityRank(worst)) worst = alert.severity;
  return worst;
}

/** A direction's rate, or 'unbounded' already baked in — for a compact one-line summary. */
export function rateSummary(rate: Rate | undefined): string {
  if (!rate) return '—';
  if (rate.upBpsPerHour === rate.downBpsPerHour) return rateLabel(rate.upBpsPerHour);
  return `${rateLabel(rate.upBpsPerHour)} up / ${rateLabel(rate.downBpsPerHour)} down`;
}
