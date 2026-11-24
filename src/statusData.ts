import { parseOracleStatus } from './oracleStatus';
import type { OracleStatus } from './types';

/**
 * Where the keeper publishes its status report: the same GitHub Actions schedule that keeps
 * the suspicious-move clock (damper-backend ADR 0008) also publishes this (ADR 0009), to the
 * same `keeper-state` branch.
 */
export const STATUS_LIVE_URL =
  (import.meta.env.VITE_STATUS_URL as string | undefined) ??
  'https://raw.githubusercontent.com/Dampper/damper-backend/keeper-state/oracle-status.json';

export const STATUS_SNAPSHOT_URL = `${import.meta.env.BASE_URL}data/oracle-status.json`;

export interface LoadedStatus {
  status: OracleStatus;
  source: 'live' | 'snapshot';
  liveError?: string;
}

async function fetchStatus(url: string, signal?: AbortSignal): Promise<OracleStatus> {
  const res = await fetch(url, { signal, cache: 'no-cache' });
  if (!res.ok) throw new Error(`the status report answered ${res.status}`);
  return parseOracleStatus(await res.json());
}

export async function loadStatus(signal?: AbortSignal, fetcher = fetchStatus): Promise<LoadedStatus> {
  try {
    return { status: await fetcher(STATUS_LIVE_URL, signal), source: 'live' };
  } catch (e) {
    if (signal?.aborted) throw e;
    const liveError = (e as Error).message;
    return { status: await fetcher(STATUS_SNAPSHOT_URL, signal), source: 'snapshot', liveError };
  }
}
