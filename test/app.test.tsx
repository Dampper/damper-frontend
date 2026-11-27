import { readFileSync } from 'node:fs';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../src/App';
import { logDomain, xOf } from '../src/components/CostChart';
import { parseHash } from '../src/router';

const snapshot = readFileSync('public/data/latest.json', 'utf8');
const statusSnapshot = readFileSync('public/data/oracle-status.json', 'utf8');

function mockFetch(live: 'ok' | '404' | 'bad-json') {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const u = String(url);
      const isLive = u.includes('raw.githubusercontent.com');
      if (u.includes('oracle-status')) {
        if (isLive && live === '404') return new Response('nope', { status: 404 });
        if (isLive && live === 'bad-json') return new Response('{"assets": 3}', { status: 200 });
        return new Response(statusSnapshot, { status: 200 });
      }
      if (isLive && live === '404') return new Response('nope', { status: 404 });
      if (isLive && live === 'bad-json') return new Response('{"pools": 3}', { status: 200 });
      return new Response(snapshot, { status: 200 });
    }),
  );
}

beforeEach(() => {
  // jsdom has no layout engine
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
      unobserve() {}
    },
  );
  window.location.hash = '';
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('App', () => {
  it('shows the live report without a fallback banner', async () => {
    mockFetch('ok');
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Pool risk' })).toBeTruthy();
    expect(screen.queryByText(/bundled with this build/)).toBeNull();
    expect(screen.getByText(/live report/)).toBeTruthy();
  });

  it('falls back to the bundled snapshot and says so when the live report is missing', async () => {
    mockFetch('404');
    render(<App />);
    expect(await screen.findByText(/bundled with this build/)).toBeTruthy();
    expect(screen.getByText(/answered 404/)).toBeTruthy();
    expect(screen.getAllByText('YieldBlox').length).toBeGreaterThan(0);
  });

  it('falls back when the live report does not match the expected format', async () => {
    mockFetch('bad-json');
    render(<App />);
    expect(await screen.findByText(/bundled with this build/)).toBeTruthy();
  });

  it('shows an error when no report can be read at all', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('x', { status: 500 })));
    render(<App />);
    expect(await screen.findByRole('alert')).toBeTruthy();
  });

  it('filters the pool list to pools open for borrowing', async () => {
    mockFetch('ok');
    render(<App />);
    await screen.findByRole('heading', { name: 'Pool risk' });
    const table = () => screen.getByRole('table');
    const rowsBefore = within(table()).getAllByRole('row').length;
    fireEvent.click(screen.getByRole('button', { name: /Borrowing open/ }));
    const rowsAfter = within(table()).getAllByRole('row').length;
    expect(rowsAfter).toBeLessThan(rowsBefore);
    expect(screen.getByRole('button', { name: /Borrowing open/ }).getAttribute('aria-pressed')).toBe('true');
  });

  it('puts the filter in the URL and keeps it across a reload (#7)', async () => {
    mockFetch('ok');
    render(<App />);
    await screen.findByRole('heading', { name: 'Pool risk' });

    fireEvent.click(screen.getByRole('button', { name: /Borrowing open/ }));
    expect(window.location.hash).toBe('#/?filter=open');

    cleanup();
    // A fresh mount from that same hash, the way a page reload (or a shared link) would start.
    render(<App />);
    await screen.findByRole('heading', { name: 'Pool risk' });
    expect(screen.getByRole('button', { name: /Borrowing open/ }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: /^All/ }).getAttribute('aria-pressed')).toBe('false');

    fireEvent.click(screen.getByRole('button', { name: /^All/ }));
    expect(window.location.hash).toBe('#/');
  });

  it('opens a pool from the hash and lists its reserves and both charts', async () => {
    mockFetch('ok');
    const id = JSON.parse(snapshot).pools.find((p: { name: string }) => p.name === 'YieldBlox').id;
    window.location.hash = `#/pool/${id}`;
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'YieldBlox' })).toBeTruthy();
    expect(screen.getByText('If the price of a collateral asset were pushed up')).toBeTruthy();
    expect(screen.getByText('If the price of a borrowed asset were pushed down')).toBeTruthy();
    // every number in the chart is also in a table
    expect(screen.getAllByText('Show as a table').length).toBe(2);
  });

  it('says so when the pool is not in the scan', async () => {
    mockFetch('ok');
    window.location.hash = '#/pool/CNOTAPOOL';
    render(<App />);
    expect(await screen.findByText(/No pool with that address/)).toBeTruthy();
  });

  it('navigates to the method page without needing data', async () => {
    mockFetch('ok');
    render(<App />);
    await screen.findByRole('heading', { name: 'Pool risk' });
    await act(async () => {
      window.location.hash = '#/method';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    expect(await screen.findByRole('heading', { name: 'How it is measured' })).toBeTruthy();
  });

  it('shows the oracle status page with the live report', async () => {
    mockFetch('ok');
    window.location.hash = '#/status';
    render(<App />);
    const main = await screen.findByRole('main');
    expect(await within(main).findByRole('heading', { name: 'Oracle status' })).toBeTruthy();
    expect(within(main).getByText(/live report/)).toBeTruthy();
    expect(within(main).queryByText(/bundled with this build/)).toBeNull();
  });

  it('falls back to the bundled status snapshot and says why', async () => {
    mockFetch('404');
    window.location.hash = '#/status';
    render(<App />);
    const main = await screen.findByRole('main');
    expect(await within(main).findByRole('heading', { name: 'Oracle status' })).toBeTruthy();
    expect(await within(main).findByText(/status bundled with this build/)).toBeTruthy();
    expect(within(main).getByText(/answered 404/)).toBeTruthy();
  });

  it('cycles the theme and writes it to the document', async () => {
    mockFetch('ok');
    render(<App />);
    await screen.findByRole('heading', { name: 'Pool risk' });
    fireEvent.click(screen.getByRole('button', { name: /Theme/ }));
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    fireEvent.click(screen.getByRole('button', { name: /Theme/ }));
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    fireEvent.click(screen.getByRole('button', { name: /Theme/ }));
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });
});

describe('routing', () => {
  it('parses hashes', () => {
    expect(parseHash('')).toEqual({ page: 'pools' });
    expect(parseHash('#/')).toEqual({ page: 'pools' });
    expect(parseHash('#/method')).toEqual({ page: 'method' });
    expect(parseHash('#/status')).toEqual({ page: 'status' });
    expect(parseHash('#/pool/CABC123')).toEqual({ page: 'pool', id: 'CABC123' });
    expect(parseHash('#/pool/not valid')).toEqual({ page: 'pools' });
    expect(parseHash('#/elsewhere')).toEqual({ page: 'pools' });
  });
});

describe('chart scale', () => {
  it('bounds the data with whole powers of ten, at least two decades wide', () => {
    expect(logDomain([283_900, 8_900])).toEqual({ loE: 3, hiE: 6 });
    expect(logDomain([50_000, 60_000])).toEqual({ loE: 3, hiE: 5 });
    expect(logDomain([1_000, 1_000])).toEqual({ loE: 2, hiE: 4 });
    expect(logDomain([])).toBeUndefined();
    expect(logDomain([0, -5, NaN])).toBeUndefined();
  });

  it('places values on a log scale inside the padded plot area', () => {
    const w = 600;
    expect(xOf(1e3, 3, 6, w)).toBeCloseTo(14);
    expect(xOf(1e6, 3, 6, w)).toBeCloseTo(586);
    // one decade is a third of the way
    expect(xOf(1e4, 3, 6, w)).toBeCloseTo(14 + (572 / 3));
    // equal ratios are equally far apart
    expect(xOf(2e4, 3, 6, w) - xOf(1e4, 3, 6, w)).toBeCloseTo(xOf(2e5, 3, 6, w) - xOf(1e5, 3, 6, w));
  });
});
