import { parseReport } from './report';
import type { Report } from './types';

/**
 * Where the scanner publishes its latest report: damper-backend's scheduled workflow pushes
 * it to the `reports` branch. raw.githubusercontent.com allows cross-origin reads.
 */
export const LIVE_URL =
  (import.meta.env.VITE_REPORT_URL as string | undefined) ??
  'https://raw.githubusercontent.com/UbsOrg/damper-backend/reports/latest.json';

export const SNAPSHOT_URL = `${import.meta.env.BASE_URL}data/latest.json`;

export interface Loaded {
  report: Report;
  /** 'live' when read from the scanner's published report, 'snapshot' when from the copy bundled with this build. */
  source: 'live' | 'snapshot';
  /** Why the live report was not used, when source is 'snapshot'. */
  liveError?: string;
}

async function fetchReport(url: string, signal?: AbortSignal): Promise<Report> {
  const res = await fetch(url, { signal, cache: 'no-cache' });
  if (!res.ok) throw new Error(`the report answered ${res.status}`);
  return parseReport(await res.json());
}

export async function loadReport(signal?: AbortSignal, fetcher = fetchReport): Promise<Loaded> {
  try {
    return { report: await fetcher(LIVE_URL, signal), source: 'live' };
  } catch (e) {
    if (signal?.aborted) throw e;
    const liveError = (e as Error).message;
    return { report: await fetcher(SNAPSHOT_URL, signal), source: 'snapshot', liveError };
  }
}
