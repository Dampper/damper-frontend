import { useEffect, useState } from 'react';
import type { Filter } from './derive';

export type Route =
  | { page: 'pools'; filter: Filter }
  | { page: 'pool'; id: string }
  | { page: 'method' }
  | { page: 'status' };

function parseFilter(query: string | undefined): Filter {
  return new URLSearchParams(query ?? '').get('filter') === 'open' ? 'open' : 'all';
}

/**
 * `#/path?query`: the path selects the page, the query carries a page's own view state
 * (currently just the pools filter, #7) so a reload or a shared link keeps it.
 */
export function parseHash(hash: string): Route {
  const [path, query] = hash.replace(/^#\/?/, '').split('?');
  if (path === 'method') return { page: 'method' };
  if (path === 'status') return { page: 'status' };
  const m = /^pool\/([A-Z0-9]+)$/.exec(path ?? '');
  if (m) return { page: 'pool', id: m[1]! };
  return { page: 'pools', filter: parseFilter(query) };
}

export const href = {
  pools: (filter: Filter = 'all') => (filter === 'open' ? '#/?filter=open' : '#/'),
  pool: (id: string) => `#/pool/${id}`,
  method: () => '#/method',
  status: () => '#/status',
};

/**
 * Sets the hash and dispatches `hashchange` itself rather than trusting the browser (or
 * jsdom, which does not always) to do it, so a programmatic change to view state packed into
 * the hash query (like the pools filter, #7) is reflected immediately rather than only on
 * the next real navigation.
 */
export function navigate(hash: string): void {
  window.location.hash = hash;
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

/** Hash routing keeps the app a static site: any host that serves index.html will do. */
export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));
  useEffect(() => {
    const on = () => {
      setRoute(parseHash(window.location.hash));
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}
