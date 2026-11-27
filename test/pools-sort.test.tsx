import { readFileSync } from 'node:fs';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../src/App';
import { DEFAULT_SORT, defaultDir, nextSort, visiblePools } from '../src/derive';
import { parseReport } from '../src/report';

const snapshot = readFileSync('public/data/latest.json', 'utf8');
const statusSnapshot = readFileSync('public/data/oracle-status.json', 'utf8');
const report = parseReport(JSON.parse(snapshot));

const names = (sort: Parameters<typeof visiblePools>[2], filter: 'all' | 'open' = 'all') =>
  visiblePools(report, filter, sort).map((p) => p.name);

describe('visiblePools sorting', () => {
  it('keeps the largest pool first by default', () => {
    const supply = visiblePools(report, 'all').map((p) => p.supplyUsd);
    expect(supply).toEqual([...supply].sort((a, b) => b - a));
    expect(visiblePools(report, 'all', DEFAULT_SORT)).toEqual(visiblePools(report, 'all'));
  });

  it('sorts by name, status, supply, borrowed and tier in both directions', () => {
    expect(names({ key: 'name', dir: 'asc' })).toEqual(['Etherfuse admin frozen', 'Fixed on ice', 'Fixed v2.1 admin', 'YieldBlox on ice']);
    expect(names({ key: 'name', dir: 'desc' })).toEqual(['YieldBlox on ice', 'Fixed v2.1 admin', 'Fixed on ice', 'Etherfuse admin frozen']);

    const byBorrowed = visiblePools(report, 'all', { key: 'borrowed', dir: 'asc' }).map((p) => p.borrowedUsd);
    expect(byBorrowed).toEqual([...byBorrowed].sort((a, b) => a - b));
    const bySupply = visiblePools(report, 'all', { key: 'supply', dir: 'asc' }).map((p) => p.supplyUsd);
    expect(bySupply).toEqual([...bySupply].sort((a, b) => a - b));

    const status = visiblePools(report, 'all', { key: 'status', dir: 'asc' }).map((p) => p.status);
    expect(status).toEqual([...status].sort((a, b) => a.localeCompare(b)));
  });

  it('puts the most severe tier first when sorting tiers ascending', () => {
    const tiers = visiblePools(report, 'all', { key: 'tier', dir: 'asc' }).map((p) => p.tier);
    expect(tiers[0]).toBe('medium');
    expect(visiblePools(report, 'all', { key: 'tier', dir: 'desc' }).at(-1)!.tier).toBe('medium');
  });

  it('breaks ties by name so the order is stable, and does not touch the report', () => {
    const before = report.pools.map((p) => p.id);
    const tiers = visiblePools(report, 'all', { key: 'tier', dir: 'asc' });
    const externals = tiers.filter((p) => p.tier === 'external').map((p) => p.name);
    expect(externals).toEqual([...externals].sort((a, b) => a.localeCompare(b)));
    expect(report.pools.map((p) => p.id)).toEqual(before);
  });

  it('sorts only the pools the borrowing filter leaves', () => {
    expect(names({ key: 'name', dir: 'asc' }, 'open')).toEqual(['Fixed v2.1 admin']);
  });
});

describe('nextSort', () => {
  it('starts amounts descending and text and tiers ascending', () => {
    expect(defaultDir('supply')).toBe('desc');
    expect(defaultDir('borrowed')).toBe('desc');
    expect(defaultDir('name')).toBe('asc');
    expect(defaultDir('tier')).toBe('asc');
    expect(nextSort(DEFAULT_SORT, 'name')).toEqual({ key: 'name', dir: 'asc' });
  });

  it('flips the direction when the active column is chosen again', () => {
    expect(nextSort({ key: 'name', dir: 'asc' }, 'name')).toEqual({ key: 'name', dir: 'desc' });
    expect(nextSort({ key: 'name', dir: 'desc' }, 'name')).toEqual({ key: 'name', dir: 'asc' });
  });
});

function mockFetch() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => new Response(String(url).includes('oracle-status') ? statusSnapshot : snapshot, { status: 200 })),
  );
}

beforeEach(() => {
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
const header = (name: string) => screen.getByRole('button', { name }).closest('th')!;

describe('pools table sorting', () => {
  it('starts sorted by supplied, largest first, and marks that header', async () => {
    mockFetch();
    render(<App />);
    await screen.findByRole('heading', { name: 'Pool risk' });

    expect(rowNames()[0]).toBe('Fixed on ice');
    expect(header('Supplied').getAttribute('aria-sort')).toBe('descending');
    expect(header('Pool').getAttribute('aria-sort')).toBeNull();
  });

  it('sorts by a clicked header, flips on a second click and moves aria-sort with it', async () => {
    mockFetch();
    render(<App />);
    await screen.findByRole('heading', { name: 'Pool risk' });

    fireEvent.click(screen.getByRole('button', { name: 'Pool' }));
    expect(rowNames()).toEqual(['Etherfuse admin frozen', 'Fixed on ice', 'Fixed v2.1 admin', 'YieldBlox on ice']);
    expect(header('Pool').getAttribute('aria-sort')).toBe('ascending');
    expect(header('Supplied').getAttribute('aria-sort')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Pool' }));
    expect(rowNames()[0]).toBe('YieldBlox on ice');
    expect(header('Pool').getAttribute('aria-sort')).toBe('descending');
  });

  it('sorts by tier with the most severe first', async () => {
    mockFetch();
    render(<App />);
    await screen.findByRole('heading', { name: 'Pool risk' });

    fireEvent.click(screen.getByRole('button', { name: 'Highest tier' }));

    expect(rowNames()[0]).toBe('YieldBlox on ice');
  });

  it('uses real buttons in the headers, so the keyboard can sort', async () => {
    mockFetch();
    render(<App />);
    await screen.findByRole('heading', { name: 'Pool risk' });

    const buttons = within(screen.getByRole('table')).getAllByRole('button');
    expect(buttons.map((b) => b.textContent?.replace(/[▲▼]/g, ''))).toEqual(['Pool', 'Status', 'Supplied', 'Borrowed', 'Highest tier']);
    for (const b of buttons) {
      expect(b.tagName).toBe('BUTTON');
      expect(b.getAttribute('type')).toBe('button');
      expect(b.tabIndex).toBe(0);
    }
  });
});
