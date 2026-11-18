/**
 * The scanner's report, as written by damper-backend (`src/scan.ts`). Kept in step by hand;
 * `parseReport` rejects anything that does not match, so a drift shows up as a clear error
 * instead of a half-rendered page.
 */

export type Tier = 'critical' | 'high' | 'medium' | 'low' | 'external' | 'n/a';

export type UpstreamKind = 'reflector-dex' | 'reflector-cex' | 'operator-feed' | 'unknown';

export interface PriceSource {
  poolOracle: string;
  upstream: string;
  upstreamKind: UpstreamKind;
  upstreamAdmin?: string;
  maxDevPct: number | undefined;
  resolutionSec: number | undefined;
  maxAgeSec: number | undefined;
  isBaseAsset: boolean;
}

export interface Market {
  mid: number | undefined;
  up2x: number;
  up10x: number;
  up100x: number;
  down2x: number;
  down10x: number;
  volume24hUsd: number;
}

export interface Side {
  exposureUsd: number;
  costUsd: number | undefined;
  tier: Tier;
}

export interface Reserve {
  asset: string;
  symbol: string;
  priceUsd: number | undefined;
  collateralFactor: number;
  liabilityFactor: number;
  maxUtil: number;
  supplied: number;
  borrowed: number;
  enabled: boolean;
  source: PriceSource;
  market: Market | undefined;
  collateralSide: Side;
  debtSide: Side;
  notes: string[];
}

export interface Pool {
  id: string;
  name: string;
  status: string;
  borrowingOpen: boolean;
  oracle: string;
  supplyUsd: number;
  borrowedUsd: number;
  tier: Tier;
  reserves: Reserve[];
}

export interface Report {
  scannedAt: string;
  ledger: number;
  pools: Pool[];
  errors: { pool: string; error: string }[];
}
