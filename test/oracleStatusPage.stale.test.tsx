import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OracleStatusPage } from '../src/components/OracleStatusPage';

function mockLiveStatus(at: number) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) =>
      String(url).includes('raw.githubusercontent.com')
        ? new Response(JSON.stringify({ at, network: 'testnet', oracle: 'CORACLE', assets: [] }), { status: 200 })
        : new Response('not found', { status: 404 }),
    ),
  );
}

describe('OracleStatusPage stale-report banner (#10)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-01T00:00:00.000Z'));
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  const nowSecs = () => Math.floor(Date.now() / 1000);

  it('shows no staleness banner for a report well inside 15 minutes old', async () => {
    mockLiveStatus(nowSecs() - 5 * 60);
    render(<OracleStatusPage />);

    await screen.findByRole('heading', { name: 'Oracle status' });
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('shows no banner at exactly 15 minutes old', async () => {
    mockLiveStatus(nowSecs() - 15 * 60);
    render(<OracleStatusPage />);

    await screen.findByRole('heading', { name: 'Oracle status' });
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('shows a banner with the age once the report is more than 15 minutes old', async () => {
    mockLiveStatus(nowSecs() - 20 * 60);
    render(<OracleStatusPage />);

    await screen.findByRole('heading', { name: 'Oracle status' });
    const banner = await screen.findByRole('alert');
    expect(banner.textContent).toMatch(/20 min ago/);
    expect(banner.textContent).toMatch(/keeper may have stopped/i);
  });

  it('shows the banner for a report hours old, worded in hours', async () => {
    mockLiveStatus(nowSecs() - 3 * 3600);
    render(<OracleStatusPage />);

    await screen.findByRole('heading', { name: 'Oracle status' });
    const banner = await screen.findByRole('alert');
    expect(banner.textContent).toMatch(/3 h ago/);
  });
});
