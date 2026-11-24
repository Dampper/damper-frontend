import type { Market, Pool, PriceSource, Report, Reserve, Side, Tier, UpstreamKind } from './types';

export class ReportError extends Error {
  constructor(path: string, expected: string) {
    super(`Report is not in the expected format: ${path} should be ${expected}`);
  }
}

const TIERS: Tier[] = ['critical', 'high', 'medium', 'low', 'external', 'n/a'];
const KINDS: UpstreamKind[] = ['reflector-dex', 'reflector-cex', 'operator-feed', 'unknown'];

export type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec => typeof v === 'object' && v !== null && !Array.isArray(v);

export function str(o: Rec, k: string, path: string): string {
  const v = o[k];
  if (typeof v !== 'string') throw new ReportError(`${path}.${k}`, 'a string');
  return v;
}
export function num(o: Rec, k: string, path: string): number {
  const v = o[k];
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new ReportError(`${path}.${k}`, 'a number');
  return v;
}
export function optNum(o: Rec, k: string, path: string): number | undefined {
  const v = o[k];
  if (v === undefined || v === null) return undefined;
  return num(o, k, path);
}
export function bool(o: Rec, k: string, path: string): boolean {
  const v = o[k];
  if (typeof v !== 'boolean') throw new ReportError(`${path}.${k}`, 'a boolean');
  return v;
}
function tier(o: Rec, k: string, path: string): Tier {
  const v = o[k];
  if (typeof v !== 'string' || !TIERS.includes(v as Tier)) throw new ReportError(`${path}.${k}`, `one of ${TIERS.join(', ')}`);
  return v as Tier;
}
export function rec(v: unknown, path: string): Rec {
  if (!isRec(v)) throw new ReportError(path, 'an object');
  return v;
}
export function arr(v: unknown, path: string): unknown[] {
  if (!Array.isArray(v)) throw new ReportError(path, 'an array');
  return v;
}
/** A big (possibly 128-bit) integer the oracle sent as a decimal string, e.g. an i128 price. */
export function bigStr(o: Rec, k: string, path: string): bigint {
  const v = o[k];
  if (typeof v !== 'string' || !/^-?\d+$/.test(v)) throw new ReportError(`${path}.${k}`, 'a decimal integer string');
  return BigInt(v);
}
export function optBigStr(o: Rec, k: string, path: string): bigint | undefined {
  const v = o[k];
  if (v === undefined || v === null) return undefined;
  return bigStr(o, k, path);
}

function parseSource(v: unknown, path: string): PriceSource {
  const o = rec(v, path);
  const kind = str(o, 'upstreamKind', path);
  if (!KINDS.includes(kind as UpstreamKind)) throw new ReportError(`${path}.upstreamKind`, `one of ${KINDS.join(', ')}`);
  return {
    poolOracle: str(o, 'poolOracle', path),
    upstream: str(o, 'upstream', path),
    upstreamKind: kind as UpstreamKind,
    upstreamAdmin: typeof o.upstreamAdmin === 'string' ? o.upstreamAdmin : undefined,
    maxDevPct: optNum(o, 'maxDevPct', path),
    resolutionSec: optNum(o, 'resolutionSec', path),
    maxAgeSec: optNum(o, 'maxAgeSec', path),
    isBaseAsset: bool(o, 'isBaseAsset', path),
  };
}

function parseMarket(v: unknown, path: string): Market | undefined {
  if (v === undefined || v === null) return undefined;
  const o = rec(v, path);
  return {
    mid: optNum(o, 'mid', path),
    up2x: num(o, 'up2x', path),
    up10x: num(o, 'up10x', path),
    up100x: num(o, 'up100x', path),
    down2x: num(o, 'down2x', path),
    down10x: num(o, 'down10x', path),
    volume24hUsd: num(o, 'volume24hUsd', path),
  };
}

function parseSide(v: unknown, path: string): Side {
  const o = rec(v, path);
  return { exposureUsd: num(o, 'exposureUsd', path), costUsd: optNum(o, 'costUsd', path), tier: tier(o, 'tier', path) };
}

function parseReserve(v: unknown, path: string): Reserve {
  const o = rec(v, path);
  return {
    asset: str(o, 'asset', path),
    symbol: str(o, 'symbol', path),
    priceUsd: optNum(o, 'priceUsd', path),
    collateralFactor: num(o, 'collateralFactor', path),
    liabilityFactor: num(o, 'liabilityFactor', path),
    maxUtil: num(o, 'maxUtil', path),
    supplied: num(o, 'supplied', path),
    borrowed: num(o, 'borrowed', path),
    enabled: bool(o, 'enabled', path),
    source: parseSource(o.source, `${path}.source`),
    market: parseMarket(o.market, `${path}.market`),
    collateralSide: parseSide(o.collateralSide, `${path}.collateralSide`),
    debtSide: parseSide(o.debtSide, `${path}.debtSide`),
    notes: arr(o.notes, `${path}.notes`).map((n, i) => {
      if (typeof n !== 'string') throw new ReportError(`${path}.notes[${i}]`, 'a string');
      return n;
    }),
  };
}

function parsePool(v: unknown, path: string): Pool {
  const o = rec(v, path);
  return {
    id: str(o, 'id', path),
    name: str(o, 'name', path),
    status: str(o, 'status', path),
    borrowingOpen: bool(o, 'borrowingOpen', path),
    oracle: str(o, 'oracle', path),
    supplyUsd: num(o, 'supplyUsd', path),
    borrowedUsd: num(o, 'borrowedUsd', path),
    tier: tier(o, 'tier', path),
    reserves: arr(o.reserves, `${path}.reserves`).map((r, i) => parseReserve(r, `${path}.reserves[${i}]`)),
  };
}

/** Validate JSON from the scanner and return it typed. Throws a ReportError naming the first bad field. */
export function parseReport(json: unknown): Report {
  const o = rec(json, 'report');
  const scannedAt = str(o, 'scannedAt', 'report');
  if (Number.isNaN(Date.parse(scannedAt))) throw new ReportError('report.scannedAt', 'an ISO date');
  return {
    scannedAt,
    ledger: num(o, 'ledger', 'report'),
    pools: arr(o.pools, 'report.pools').map((p, i) => parsePool(p, `report.pools[${i}]`)),
    errors: arr(o.errors, 'report.errors').map((e, i) => {
      const r = rec(e, `report.errors[${i}]`);
      return { pool: str(r, 'pool', `report.errors[${i}]`), error: str(r, 'error', `report.errors[${i}]`) };
    }),
  };
}
