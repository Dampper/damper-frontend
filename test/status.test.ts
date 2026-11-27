import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseOracleStatus } from '../src/oracleStatus';
import { ReportError } from '../src/report';
import { loadStatus } from '../src/statusData';
import {
  STALE_STATUS_SECS,
  anchorAgeSecs,
  costRatioLabel,
  fixedToNumber,
  isStatusStale,
  isTightened,
  rateLabel,
  rateSummary,
  statusAgeSecs,
  worstSeverity,
} from '../src/oracleDerive';

const raw = JSON.parse(readFileSync('public/data/oracle-status.json', 'utf8'));
const status = parseOracleStatus(raw);

describe('parseOracleStatus', () => {
  it('accepts the report bundled with the app', () => {
    expect(status.assets.length).toBeGreaterThan(0);
    expect(status.network).toBe('testnet');
  });

  it('parses i128 fixed-point fields as exact bigints, not lossy numbers', () => {
    const a = status.assets[0]!;
    expect(typeof a.raw).toBe('bigint');
    expect(typeof a.anchor!.price).toBe('bigint');
    expect(typeof a.evidence!.upCost).toBe('bigint');
  });

  it('round-trips a value bigger than Number.MAX_SAFE_INTEGER exactly', () => {
    const huge = structuredClone(raw);
    huge.assets[0].raw = '123456789012345678901234567890';
    const parsed = parseOracleStatus(huge);
    expect(parsed.assets[0]!.raw).toBe(123_456_789_012_345_678_901_234_567_890n);
  });

  it('names the first field that is wrong', () => {
    const bad = structuredClone(raw);
    bad.assets[0].alerts[0].severity = 'severe';
    expect(() => parseOracleStatus(bad)).toThrow(/assets\[0\]\.alerts\[0\]\.severity/);
    expect(() => parseOracleStatus({ ...raw, at: 'x' })).toThrow(ReportError);
    expect(() => parseOracleStatus(null)).toThrow(/status should be an object/);
  });

  it('rejects a raw value that is not a decimal integer string', () => {
    const bad = structuredClone(raw);
    bad.assets[0].raw = '12.5';
    expect(() => parseOracleStatus(bad)).toThrow(/raw/);
    bad.assets[0].raw = 'not a number';
    expect(() => parseOracleStatus(bad)).toThrow(/raw/);
  });

  it('treats a missing gate, evidence or anchor as undefined, not as an error', () => {
    const noGate = structuredClone(raw);
    delete noGate.assets[0].gate;
    delete noGate.assets[0].evidence;
    delete noGate.assets[0].anchor;
    const parsed = parseOracleStatus(noGate);
    expect(parsed.assets[0]).toMatchObject({ gate: undefined, evidence: undefined, anchor: undefined });
  });

  it('accepts an oracle with no assets', () => {
    expect(parseOracleStatus({ ...raw, assets: [] }).assets).toEqual([]);
  });
});

describe('loadStatus', () => {
  it('uses the live report when it parses', async () => {
    const got = await loadStatus(undefined, async () => status);
    expect(got.source).toBe('live');
  });

  it('falls back to the bundled snapshot and says why', async () => {
    let calls = 0;
    const got = await loadStatus(undefined, async (url) => {
      calls++;
      if (calls === 1) throw new Error(`${url} answered 404`);
      return status;
    });
    expect(got.source).toBe('snapshot');
    expect(got.liveError).toMatch(/404/);
  });

  it('does not mask an abort as a fallback', async () => {
    const c = new AbortController();
    c.abort();
    await expect(
      loadStatus(c.signal, async () => {
        throw new Error('aborted');
      }),
    ).rejects.toThrow('aborted');
  });
});

describe('rateLabel', () => {
  it('formats bps/hour as a percentage, and the sentinel as unbounded', () => {
    expect(rateLabel(1500)).toBe('15%/h');
    expect(rateLabel(150)).toBe('1.5%/h');
    expect(rateLabel(4_294_967_295)).toBe('unbounded');
  });
});

describe('costRatioLabel', () => {
  it('formats basis points as a multiple', () => {
    expect(costRatioLabel(100_000)).toBe('10×');
    expect(costRatioLabel(20_000)).toBe('2×');
    expect(costRatioLabel(15_000)).toBe('1.5×');
  });
});

describe('rateSummary', () => {
  it('collapses a symmetric rate to one figure and keeps an asymmetric one split', () => {
    expect(rateSummary({ upBpsPerHour: 500, downBpsPerHour: 500, windowSecs: 3600 })).toBe('5%/h');
    expect(rateSummary({ upBpsPerHour: 1500, downBpsPerHour: 4_294_967_295, windowSecs: 3600 })).toBe('15%/h up / unbounded down');
    expect(rateSummary(undefined)).toBe('—');
  });
});

describe('fixedToNumber', () => {
  it('scales by decimals', () => {
    expect(fixedToNumber(10_600_000n, 7)).toBe(1.06);
    expect(fixedToNumber(undefined, 7)).toBeUndefined();
    expect(fixedToNumber(10n, undefined)).toBeUndefined();
  });
});

describe('anchorAgeSecs', () => {
  it('is the gap between now and when the anchor last moved, never negative', () => {
    expect(anchorAgeSecs({ ...status.assets[0]!, anchor: { price: 1n, timestamp: 100 } }, 160)).toBe(60);
    expect(anchorAgeSecs({ ...status.assets[0]!, anchor: { price: 1n, timestamp: 200 } }, 160)).toBe(0);
    expect(anchorAgeSecs({ ...status.assets[0]!, anchor: undefined }, 160)).toBeUndefined();
  });
});

describe('isTightened', () => {
  const base = status.assets[0]!;
  it('is true only when the effective rate sits below the policy rate in a bounded direction', () => {
    expect(isTightened({ ...base, policy: { upBpsPerHour: 1500, downBpsPerHour: 4_294_967_295, windowSecs: 1 }, effectivePolicy: { upBpsPerHour: 150, downBpsPerHour: 4_294_967_295, windowSecs: 1 } })).toBe(true);
    expect(isTightened({ ...base, policy: { upBpsPerHour: 1500, downBpsPerHour: 4_294_967_295, windowSecs: 1 }, effectivePolicy: { upBpsPerHour: 1500, downBpsPerHour: 4_294_967_295, windowSecs: 1 } })).toBe(false);
    expect(isTightened({ ...base, policy: undefined, effectivePolicy: undefined })).toBe(false);
  });
});

describe('worstSeverity', () => {
  it('is the most severe alert across every asset, or undefined when none fired', () => {
    expect(worstSeverity({ at: 0, network: 'x', oracle: 'x', assets: [{ ...status.assets[0]!, alerts: [{ severity: 'info', code: 'a', message: 'm' }] }, { ...status.assets[0]!, alerts: [{ severity: 'critical', code: 'b', message: 'm' }] }] })).toBe('critical');
    expect(worstSeverity({ at: 0, network: 'x', oracle: 'x', assets: [{ ...status.assets[0]!, alerts: [] }] })).toBeUndefined();
  });
});

describe('statusAgeSecs / isStatusStale (#10)', () => {
  const at = { at: 1_000_000, network: 'x', oracle: 'x', assets: [] } as const;

  it('is the gap between now and the report time, never negative', () => {
    expect(statusAgeSecs(at, 1_000_500)).toBe(500);
    expect(statusAgeSecs(at, 1_000_000)).toBe(0);
    expect(statusAgeSecs(at, 999_000)).toBe(0); // a report that claims to be from the future
  });

  it('is not stale at or before the default 15-minute threshold, stale just after it', () => {
    expect(isStatusStale(at, at.at + STALE_STATUS_SECS)).toBe(false);
    expect(isStatusStale(at, at.at + STALE_STATUS_SECS + 1)).toBe(true);
    expect(isStatusStale(at, at.at)).toBe(false);
  });

  it('honours a custom threshold', () => {
    expect(isStatusStale(at, at.at + 100, 50)).toBe(true);
    expect(isStatusStale(at, at.at + 100, 200)).toBe(false);
  });
});
