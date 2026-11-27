import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { href, navigate, parseHash, useRoute } from '../src/router';

function RouteProbe() {
  const route = useRoute();
  return <pre data-testid="route">{JSON.stringify(route)}</pre>;
}

afterEach(() => {
  cleanup();
  window.location.hash = '';
});

describe('parseHash', () => {
  it('reads the plain pages', () => {
    expect(parseHash('')).toEqual({ page: 'pools', filter: 'all' });
    expect(parseHash('#/')).toEqual({ page: 'pools', filter: 'all' });
    expect(parseHash('#/method')).toEqual({ page: 'method' });
    expect(parseHash('#/status')).toEqual({ page: 'status' });
    expect(parseHash('#/pool/CABCDEF123')).toEqual({ page: 'pool', id: 'CABCDEF123' });
  });

  it('reads the pools filter from the hash query (#7)', () => {
    expect(parseHash('#/?filter=open')).toEqual({ page: 'pools', filter: 'open' });
    expect(parseHash('#/?filter=all')).toEqual({ page: 'pools', filter: 'all' });
  });

  it('defaults to "all" for a missing, empty or unrecognized filter value', () => {
    expect(parseHash('#/?')).toEqual({ page: 'pools', filter: 'all' });
    expect(parseHash('#/?foo=bar')).toEqual({ page: 'pools', filter: 'all' });
    expect(parseHash('#/?filter=bogus')).toEqual({ page: 'pools', filter: 'all' });
  });

  it('does not let a query string on method/status/pool change what page they are', () => {
    expect(parseHash('#/method?filter=open')).toEqual({ page: 'method' });
    expect(parseHash('#/status?filter=open')).toEqual({ page: 'status' });
    expect(parseHash('#/pool/CXYZ?filter=open')).toEqual({ page: 'pool', id: 'CXYZ' });
  });
});

describe('href.pools', () => {
  it('omits the query for "all" and includes it for "open"', () => {
    expect(href.pools()).toBe('#/');
    expect(href.pools('all')).toBe('#/');
    expect(href.pools('open')).toBe('#/?filter=open');
  });

  it('round-trips through parseHash', () => {
    expect(parseHash(href.pools('open'))).toEqual({ page: 'pools', filter: 'open' });
    expect(parseHash(href.pools('all'))).toEqual({ page: 'pools', filter: 'all' });
  });
});

describe('navigate', () => {
  it('sets the hash and notifies listeners immediately, even when the hash string is unchanged', () => {
    window.location.hash = '#/?filter=open';
    const seen: string[] = [];
    const on = () => seen.push(window.location.hash);
    window.addEventListener('hashchange', on);
    try {
      navigate('#/?filter=open'); // same value as already set
      expect(seen).toEqual(['#/?filter=open']);
    } finally {
      window.removeEventListener('hashchange', on);
    }
  });
});

describe('useRoute reacts to navigate (#7)', () => {
  it('updates after navigate() changes the filter', async () => {
    window.location.hash = '#/';
    render(<RouteProbe />);
    expect(screen.getByTestId('route').textContent).toBe(JSON.stringify({ page: 'pools', filter: 'all' }));

    await act(async () => navigate(href.pools('open')));

    expect(screen.getByTestId('route').textContent).toBe(JSON.stringify({ page: 'pools', filter: 'open' }));
  });

  it('starts from whatever the hash already is on mount, so a reload keeps the filter', () => {
    window.location.hash = '#/?filter=open';
    render(<RouteProbe />);
    expect(screen.getByTestId('route').textContent).toBe(JSON.stringify({ page: 'pools', filter: 'open' }));
  });
});
