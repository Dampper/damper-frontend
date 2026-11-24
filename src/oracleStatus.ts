import { ReportError, arr, bigStr, num, optBigStr, rec, str } from './report';
import type { Alert, AssetStatus, Gate, OracleStatus, Rate } from './types';

const SEVERITIES: Alert['severity'][] = ['critical', 'warn', 'info'];

function severity(o: Record<string, unknown>, k: string, path: string): Alert['severity'] {
  const v = o[k];
  if (typeof v !== 'string' || !SEVERITIES.includes(v as Alert['severity'])) {
    throw new ReportError(`${path}.${k}`, `one of ${SEVERITIES.join(', ')}`);
  }
  return v as Alert['severity'];
}

function parseRate(v: unknown, path: string): Rate | undefined {
  if (v === undefined || v === null) return undefined;
  const o = rec(v, path);
  return { upBpsPerHour: num(o, 'upBpsPerHour', path), downBpsPerHour: num(o, 'downBpsPerHour', path), windowSecs: num(o, 'windowSecs', path) };
}

function parseGate(v: unknown, path: string): Gate | undefined {
  if (v === undefined || v === null) return undefined;
  const o = rec(v, path);
  return {
    tightUpBpsPerHour: num(o, 'tightUpBpsPerHour', path),
    tightDownBpsPerHour: num(o, 'tightDownBpsPerHour', path),
    minCostRatioBps: num(o, 'minCostRatioBps', path),
    maxEvidenceAge: num(o, 'maxEvidenceAge', path),
  };
}

function parseAnchor(v: unknown, path: string): AssetStatus['anchor'] {
  if (v === undefined || v === null) return undefined;
  const o = rec(v, path);
  return { price: bigStr(o, 'price', path), timestamp: num(o, 'timestamp', path) };
}

function parseEvidence(v: unknown, path: string): AssetStatus['evidence'] {
  if (v === undefined || v === null) return undefined;
  const o = rec(v, path);
  return {
    upCost: bigStr(o, 'upCost', path),
    upExposure: bigStr(o, 'upExposure', path),
    downCost: bigStr(o, 'downCost', path),
    downExposure: bigStr(o, 'downExposure', path),
    timestamp: num(o, 'timestamp', path),
  };
}

function parseAlert(v: unknown, path: string): Alert {
  const o = rec(v, path);
  return { severity: severity(o, 'severity', path), code: str(o, 'code', path), message: str(o, 'message', path) };
}

function parseAssetStatus(v: unknown, path: string): AssetStatus {
  const o = rec(v, path);
  return {
    asset: str(o, 'asset', path),
    decimals: typeof o.decimals === 'number' ? o.decimals : undefined,
    policy: parseRate(o.policy, `${path}.policy`),
    effectivePolicy: parseRate(o.effectivePolicy, `${path}.effectivePolicy`),
    gate: parseGate(o.gate, `${path}.gate`),
    anchor: parseAnchor(o.anchor, `${path}.anchor`),
    raw: optBigStr(o, 'raw', path),
    quote: optBigStr(o, 'quote', path),
    evidence: parseEvidence(o.evidence, `${path}.evidence`),
    alerts: arr(o.alerts, `${path}.alerts`).map((a, i) => parseAlert(a, `${path}.alerts[${i}]`)),
  };
}

/** Validate JSON from the keeper's status report. Throws a ReportError naming the first bad field. */
export function parseOracleStatus(json: unknown): OracleStatus {
  const o = rec(json, 'status');
  return {
    at: num(o, 'at', 'status'),
    network: str(o, 'network', 'status'),
    oracle: str(o, 'oracle', 'status'),
    assets: arr(o.assets, 'status.assets').map((a, i) => parseAssetStatus(a, `status.assets[${i}]`)),
  };
}
