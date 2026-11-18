import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseReport, ReportError } from '../src/report';
import { loadReport } from '../src/data';
import { ago, multiple, price, shortId, usd } from '../src/format';
import { findings, plotRows, ratio, summarise, visiblePools, worstTier } from '../src/derive';

const raw = JSON.parse(readFileSync('public/data/latest.json', 'utf8'));
const report = parseReport(raw);

describe('parseReport', () => {
  it('accepts the scanner report bundled with the app', () => {
    expect(report.pools.length).toBeGreaterThan(0);
    expect(report.ledger).toBeGreaterThan(0);
  });

  it('names the first field that is wrong', () => {
    const bad = structuredClone(raw);
    bad.pools[0].reserves[0].collateralSide.tier = 'severe';
    expect(() => parseReport(bad)).toThrow(/pools\[0\]\.reserves\[0\]\.collateralSide\.tier/);
    expect(() => parseReport({ ...raw, ledger: 'x' })).toThrow(ReportError);
    expect(() => parseReport(null)).toThrow(/report should be an object/);
    expect(() => parseReport({ ...raw, scannedAt: 'yesterday' })).toThrow(/ISO date/);
  });

  it('treats a missing market and missing cost as undefined, not as an error', () => {
    const r = report.pools.flatMap((p) => p.reserves).find((x) => x.market === undefined);
    expect(r).toBeDefined();
    expect(r!.collateralSide.costUsd === undefined || typeof r!.collateralSide.costUsd === 'number').toBe(true);
  });
});

describe('loadReport', () => {
  it('uses the live report when it parses', async () => {
    const got = await loadReport(undefined, async () => report);
    expect(got.source).toBe('live');
  });

  it('falls back to the bundled snapshot and says why', async () => {
    let calls = 0;
    const got = await loadReport(undefined, async (url) => {
      calls++;
      if (calls === 1) throw new Error(`${url} answered 404`);
      return report;
    });
    expect(got.source).toBe('snapshot');
    expect(got.liveError).toMatch(/404/);
  });

  it('does not mask an abort as a fallback', async () => {
    const c = new AbortController();
    c.abort();
    await expect(
      loadReport(c.signal, async () => {
        throw new Error('aborted');
      }),
    ).rejects.toThrow('aborted');
  });
});

describe('formatting', () => {
  it('formats dollars compactly', () => {
    expect(usd(137_480_000)).toBe('$137.5M');
    expect(usd(139_080)).toBe('$139k');
    expect(usd(42_797)).toBe('$42.8k');
    expect(usd(789)).toBe('$789');
    expect(usd(0)).toBe('$0');
    expect(usd(0.5)).toBe('$0.50');
    expect(usd(undefined)).toBe('—');
    expect(usd(1_000_000_000)).toBe('$1B');
    // whole powers of ten label the chart axis; trailing zeros of the integer part must stay
    expect([1e1, 1e2, 1e3, 1e4, 1e5, 1e6, 1e7, 1e8, 1e9, 1e10].map(usd)).toEqual([
      '$10', '$100', '$1k', '$10k', '$100k', '$1M', '$10M', '$100M', '$1B', '$10B',
    ]);
    expect(usd(200_000)).toBe('$200k');
    expect(usd(30_000_000)).toBe('$30M');
  });

  it('formats multiples', () => {
    expect(multiple(12.4)).toBe('12×');
    expect(multiple(1.234)).toBe('1.2×');
    expect(multiple(0.042)).toBe('0.04×');
    expect(multiple(0.0001)).toBe('<0.01×');
    expect(multiple(2500)).toBe('2.5k×');
    expect(multiple(undefined)).toBe('—');
  });

  it('shortens ids, prices and ages', () => {
    expect(shortId('CCCCIQSDILITHMM7PBSLVDT5MISSY7R26MNZXCX4H7J5JQ5FPIYOGYFS')).toBe('CCCCI…GYFS');
    expect(price(1.0891)).toBe('$1.089');
    expect(price(0.0002289)).toBe('$0.00023');
    const now = Date.parse('2026-11-18T12:00:00Z');
    expect(ago('2026-11-18T11:59:30Z', now)).toBe('just now');
    expect(ago('2026-11-18T11:00:00Z', now)).toBe('60 min ago');
    expect(ago('2026-11-17T12:00:00Z', now)).toBe('24 h ago');
    expect(ago('2026-11-10T12:00:00Z', now)).toBe('8 days ago');
  });
});

describe('derived figures', () => {
  it('summarises the report', () => {
    const s = summarise(report);
    expect(s.pools).toBe(report.pools.length);
    expect(s.supplyUsd).toBeCloseTo(report.pools.reduce((t, p) => t + p.supplyUsd, 0));
    expect(s.borrowingOpen).toBe(report.pools.filter((p) => p.borrowingOpen).length);
  });

  it('reports no worst tier when no pool allows borrowing', () => {
    const closed = { ...report, pools: report.pools.map((p) => ({ ...p, borrowingOpen: false })) };
    expect(summarise(closed).worstOpenTier).toBeUndefined();
  });

  it('orders tiers by severity', () => {
    expect(worstTier(['low', 'external', 'high', 'n/a'])).toBe('high');
    expect(worstTier([])).toBe('n/a');
  });

  it('sorts pools by supply and can show only those open for borrowing', () => {
    const all = visiblePools(report, 'all');
    for (let i = 1; i < all.length; i++) expect(all[i - 1]!.supplyUsd).toBeGreaterThanOrEqual(all[i]!.supplyUsd);
    expect(visiblePools(report, 'open').every((p) => p.borrowingOpen)).toBe(true);
  });

  it('computes exposure over cost only when cost is positive', () => {
    expect(ratio({ exposureUsd: 50, costUsd: 10, tier: 'high' })).toBe(5);
    expect(ratio({ exposureUsd: 50, costUsd: 0, tier: 'high' })).toBeUndefined();
    expect(ratio({ exposureUsd: 50, costUsd: undefined, tier: 'n/a' })).toBeUndefined();
  });

  it('gives every reserve either two dots or a reason', () => {
    for (const pool of report.pools) {
      for (const which of ['collateral', 'debt'] as const) {
        for (const row of plotRows(pool, which)) {
          expect(row.plottable || (row.reason && row.reason.length > 0)).toBeTruthy();
          if (row.plottable) {
            expect(row.side.costUsd).toBeGreaterThan(0);
            expect(row.side.exposureUsd).toBeGreaterThan(0);
          }
        }
      }
    }
  });

  it('finds the patterns the scanner flags, each with at least one reserve', () => {
    for (const f of findings(report)) expect(f.items.length).toBeGreaterThan(0);
  });
});
