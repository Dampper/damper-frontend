import type { Pool, Report, Reserve, Side, Tier } from './types';

/** Most severe first. */
export const TIER_ORDER: Tier[] = ['critical', 'high', 'medium', 'low', 'external', 'n/a'];

export const TIER_LABEL: Record<Tier, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  external: 'Off-DEX',
  'n/a': 'Not scored',
};

export const TIER_MEANING: Record<Tier, string> = {
  critical: 'Exposure is at least 10x the capital needed to move the price, or the market barely trades while a lot is exposed.',
  high: 'Exposure is larger than the capital needed to move the price.',
  medium: 'Exposure is at least a tenth of the capital needed to move the price.',
  low: 'Exposure is well below the capital needed to move the price.',
  external: 'Priced from off-chain venues or an admin-run feed, so a trade on the Stellar DEX does not reach it. Not scored here.',
  'n/a': 'Nothing at risk through this reserve, or no market model for its price source.',
};

export function tierRank(t: Tier): number {
  return TIER_ORDER.indexOf(t);
}

export function worstTier(tiers: Tier[]): Tier {
  return tiers.reduce<Tier>((w, t) => (tierRank(t) < tierRank(w) ? t : w), 'n/a');
}

export interface Summary {
  pools: number;
  supplyUsd: number;
  borrowedUsd: number;
  borrowingOpen: number;
  /** Worst tier among pools that currently allow borrowing; undefined when none do. */
  worstOpenTier: Tier | undefined;
  worstOpenPool: Pool | undefined;
}

export function summarise(report: Report): Summary {
  const open = report.pools.filter((p) => p.borrowingOpen);
  const worst = open.reduce<Pool | undefined>((w, p) => (!w || tierRank(p.tier) < tierRank(w.tier) ? p : w), undefined);
  return {
    pools: report.pools.length,
    supplyUsd: report.pools.reduce((s, p) => s + p.supplyUsd, 0),
    borrowedUsd: report.pools.reduce((s, p) => s + p.borrowedUsd, 0),
    borrowingOpen: open.length,
    worstOpenTier: worst?.tier,
    worstOpenPool: worst,
  };
}

export type Filter = 'all' | 'open';

export type SortKey = 'name' | 'status' | 'supply' | 'borrowed' | 'tier';
export type SortDir = 'asc' | 'desc';
export interface Sort {
  key: SortKey;
  dir: SortDir;
}

/** The order the table has always had: biggest pool first. */
export const DEFAULT_SORT: Sort = { key: 'supply', dir: 'desc' };

/** Text and tier columns start ascending (A first, most severe first); amounts start with the largest. */
export function defaultDir(key: SortKey): SortDir {
  return key === 'supply' || key === 'borrowed' ? 'desc' : 'asc';
}

/** What a click on a column header does: flip the active column, or switch to a new one. */
export function nextSort(current: Sort, key: SortKey): Sort {
  if (current.key !== key) return { key, dir: defaultDir(key) };
  return { key, dir: current.dir === 'asc' ? 'desc' : 'asc' };
}

function compare(a: Pool, b: Pool, key: SortKey): number {
  switch (key) {
    case 'name':
      return a.name.localeCompare(b.name, 'en', { sensitivity: 'base' });
    case 'status':
      return a.status.localeCompare(b.status, 'en', { sensitivity: 'base' });
    case 'supply':
      return a.supplyUsd - b.supplyUsd;
    case 'borrowed':
      return a.borrowedUsd - b.borrowedUsd;
    case 'tier':
      return tierRank(a.tier) - tierRank(b.tier);
  }
}

/** Pools to list: the borrowing filter, then the chosen sort. Ties fall back to name, then id. */
export function visiblePools(report: Report, filter: Filter, sort: Sort = DEFAULT_SORT): Pool[] {
  const pools = filter === 'open' ? report.pools.filter((p) => p.borrowingOpen) : report.pools;
  const sign = sort.dir === 'asc' ? 1 : -1;
  return [...pools].sort(
    (a, b) => sign * compare(a, b, sort.key) || a.name.localeCompare(b.name) || a.id.localeCompare(b.id),
  );
}

/** exposure / cost, when both exist and cost is positive. */
export function ratio(side: Side): number | undefined {
  if (side.costUsd === undefined || side.costUsd <= 0) return undefined;
  return side.exposureUsd / side.costUsd;
}

export type SideName = 'collateral' | 'debt';

export function sideOf(r: Reserve, which: SideName): Side {
  return which === 'collateral' ? r.collateralSide : r.debtSide;
}

export interface PlotRow {
  reserve: Reserve;
  side: Side;
  /** Both dots can be drawn. */
  plottable: boolean;
  /** Why the row has no dots. */
  reason: string | undefined;
  /** The reserve plays no part on this side (not collateral, or nothing to borrow). */
  unused: boolean;
}

/** One row per reserve for a side's chart: dots where there is a market model, a reason where not. */
export function plotRows(pool: Pool, which: SideName): PlotRow[] {
  return pool.reserves.map((reserve) => {
    const side = sideOf(reserve, which);
    const used = which === 'collateral' ? reserve.collateralFactor > 0 : side.exposureUsd > 0;
    if (!used) {
      return {
        reserve,
        side,
        plottable: false,
        reason: which === 'collateral' ? 'Not accepted as collateral' : 'Nothing available to borrow',
        unused: true,
      };
    }
    if (side.costUsd === undefined || side.costUsd <= 0 || side.exposureUsd <= 0) {
      return { reserve, side, plottable: false, reason: unscoredReason(reserve), unused: false };
    }
    return { reserve, side, plottable: true, reason: undefined, unused: false };
  });
}

export function unscoredReason(r: Reserve): string {
  switch (r.source.upstreamKind) {
    case 'reflector-cex':
      return 'Priced from off-chain exchanges (Reflector CEX feed)';
    case 'operator-feed':
      return 'Priced by a feed an admin key updates';
    default:
      break;
  }
  if (r.source.isBaseAsset) return 'Fixed price of $1 set by the pool';
  return 'No on-chain market model for this price source';
}

export interface Finding {
  id: string;
  title: string;
  detail: string;
  items: { pool: Pool; reserve: Reserve }[];
}

/** Patterns worth a person's attention, with the pools and reserves they appear in. */
export function findings(report: Report): Finding[] {
  const out: Finding[] = [
    {
      id: 'operator-feed',
      title: 'Prices set by a single admin key',
      detail: 'These reserves are priced by a feed whose admin pushes the number. Trust rests on that key, not on a market.',
      items: [],
    },
    {
      id: 'no-maxdev',
      title: 'Deviation check switched off',
      detail: 'The oracle aggregator’s max_dev guard is 0 for these reserves, so any price change passes.',
      items: [],
    },
    {
      id: 'fixed-price',
      title: 'Collateral with a fixed price',
      detail: 'Priced at exactly $1 by the pool. If the asset depegs, the pool never sees it.',
      items: [],
    },
  ];
  for (const pool of report.pools) {
    for (const reserve of pool.reserves) {
      if (reserve.source.upstreamKind === 'operator-feed') out[0]!.items.push({ pool, reserve });
      if (reserve.source.maxDevPct === 0) out[1]!.items.push({ pool, reserve });
      if (reserve.source.isBaseAsset && reserve.collateralFactor > 0 && reserve.notes.some((n) => n.startsWith('fixed-price collateral'))) {
        out[2]!.items.push({ pool, reserve });
      }
    }
  }
  return out.filter((f) => f.items.length > 0);
}
