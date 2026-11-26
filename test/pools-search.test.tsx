import { readFileSync } from 'node:fs';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../src/App';
import { matchesQuery, visiblePools } from '../src/derive';
import { parseReport } from '../src/report';

const snapshot = readFileSync('public/data/latest.json', 'utf8');
const statusSnapshot = readFileSync('public/data/oracle-status.json', 'utf8');
const report = parseReport(JSON.parse(snapshot));
const found = (query: string, filter: 'all' | 'open' = 'all') =>
  visiblePools(report, filter, undefined, query).map((p) => p.name);

describe('pool search', () => {
  it('matches a pool by name, ignoring case and surrounding spaces', () => {
    expect(found('yieldblox')).toEqual(['YieldBlox on ice']);
    expect(found('  ETHERFUSE ')).toEqual(['Etherfuse admin frozen']);
  });

  it('matches a pool by the symbol of any of its reserves', () => {
    expect(found('aqua')).toEqual(['YieldBlox on ice']);
    expect(found('TESOURO')).toEqual(['Etherfuse admin frozen']);
    expect(found('xlm')).toHaveLength(report.pools.length);
  });

  it('matches part of a name or symbol and returns nothing for an unknown term', () => {
    expect(found('ice').sort()).toEqual(['Fixed on ice', 'YieldBlox on ice']);
    expect(found('no such asset')).toEqual([]);
  });

  it('treats an empty or blank query as no search', () => {
    expect(found('')).toHaveLength(report.pools.length);
    expect(found('   ')).toHaveLength(report.pools.length);
    expect(matchesQuery(report.pools[0]!, '')).toBe(true);
  });

  it('works together with the borrowing-open filter', () => {
    expect(found('xlm', 'open')).toEqual(['Fixed v2.1 admin']);
    expect(found('aqua', 'open')).toEqual([]);
  });
});

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => new Response(String(url).includes('oracle-status') ? statusSnapshot : snapshot, { status: 200 })),
  );
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

const rowNames = () => [...screen.getByRole('table').querySelectorAll('tbody a.cell-title')].map((a) => a.textContent);
const search = (value: string) =>
  fireEvent.change(screen.getByRole('searchbox', { name: /search pools/i }), { target: { value } });

describe('pools page search box', () => {
  it('narrows the table as you type and restores it when cleared', async () => {
    render(<App />);
    await screen.findByRole('heading', { name: 'Pool risk' });
    const all = rowNames().length;

    search('aqua');
    expect(rowNames()).toEqual(['YieldBlox on ice']);

    search('');
    expect(rowNames()).toHaveLength(all);
  });

  it('combines with the "Borrowing open" filter', async () => {
    render(<App />);
    await screen.findByRole('heading', { name: 'Pool risk' });

    fireEvent.click(screen.getByRole('button', { name: /Borrowing open/ }));
    search('xlm');
    expect(rowNames()).toEqual(['Fixed v2.1 admin']);

    search('aqua');
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.getByText(/No pool matches .aqua. among those open for borrowing/)).toBeTruthy();
  });

  it('says so when nothing matches the search', async () => {
    render(<App />);
    await screen.findByRole('heading', { name: 'Pool risk' });

    search('zzz');

    expect(screen.getByText(/No pool matches .zzz./)).toBeTruthy();
    expect(screen.queryByText(/allows borrowing right now/)).toBeNull();
  });
});
