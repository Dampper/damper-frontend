import { readFileSync } from 'node:fs';
import { act, cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../src/App';

const snapshot = readFileSync('public/data/latest.json', 'utf8');
const statusSnapshot = readFileSync('public/data/oracle-status.json', 'utf8');

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
  Element.prototype.scrollIntoView = vi.fn();
  window.location.hash = '';
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('glossary links from first appearance (#20)', () => {
  it('links the oracle status page\'s Anchor and Tight rate labels to their glossary entries', async () => {
    mockFetch();
    window.location.hash = '#/status';
    render(<App />);
    const main = await screen.findByRole('main');
    await within(main).findByRole('heading', { name: 'Oracle status' });

    expect(within(main).getByRole('link', { name: 'Anchor' }).getAttribute('href')).toBe('#/method?term=anchor');
    expect(within(main).getByRole('link', { name: 'Raw median' }).getAttribute('href')).toBe('#/method?term=raw');
  });

  it('links a pool page\'s Deviation guard header to its glossary entry', async () => {
    mockFetch();
    const id = JSON.parse(snapshot).pools.find((p: { name: string }) => p.name === 'YieldBlox').id;
    window.location.hash = `#/pool/${id}`;
    render(<App />);
    await screen.findByRole('heading', { name: 'YieldBlox' });

    expect(screen.getByRole('link', { name: 'Deviation guard' }).getAttribute('href')).toBe('#/method?term=deviation-guard');
  });

  it('following a glossary link lands on the Method page with its glossary entry present', async () => {
    mockFetch();
    window.location.hash = '#/status';
    render(<App />);
    const main = await screen.findByRole('main');
    await within(main).findByRole('heading', { name: 'Oracle status' });
    const anchorLink = within(main).getByRole('link', { name: 'Anchor' });

    await act(async () => {
      window.location.hash = anchorLink.getAttribute('href')!;
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });

    expect(await screen.findByRole('heading', { name: 'How it is measured' })).toBeTruthy();
    expect(document.getElementById('glossary-anchor')).not.toBeNull();
  });
});
