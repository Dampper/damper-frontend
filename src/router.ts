import { useEffect, useState } from 'react';

export type Route = { page: 'pools' } | { page: 'pool'; id: string } | { page: 'method' } | { page: 'status' };

export function parseHash(hash: string): Route {
  const path = hash.replace(/^#\/?/, '');
  if (path === 'method') return { page: 'method' };
  if (path === 'status') return { page: 'status' };
  const m = /^pool\/([A-Z0-9]+)$/.exec(path);
  if (m) return { page: 'pool', id: m[1]! };
  return { page: 'pools' };
}

export const href = {
  pools: () => '#/',
  pool: (id: string) => `#/pool/${id}`,
  method: () => '#/method',
  status: () => '#/status',
};

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
