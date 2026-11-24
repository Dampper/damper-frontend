import { useEffect, useState } from 'react';
import { loadReport, type Loaded } from './data';
import { ago, dateTime } from './format';
import { href, useRoute } from './router';
import { useTheme } from './theme';
import { Mark } from './components/icons';
import { MethodPage } from './components/MethodPage';
import { OracleStatusPage } from './components/OracleStatusPage';
import { PoolPage } from './components/PoolPage';
import { PoolsPage } from './components/PoolsPage';

type State = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; data: Loaded };

const THEME_LABEL = { system: 'Theme: system', light: 'Theme: light', dark: 'Theme: dark' } as const;

export function App() {
  const route = useRoute();
  const [theme, cycleTheme] = useTheme();
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    const ctl = new AbortController();
    loadReport(ctl.signal).then(
      (data) => setState({ status: 'ready', data }),
      (e: Error) => {
        if (!ctl.signal.aborted) setState({ status: 'error', message: e.message });
      },
    );
    return () => ctl.abort();
  }, []);

  const current = route.page === 'method' || route.page === 'status' ? route.page : 'pools';

  return (
    <div className="shell">
      <header className="header">
        <a className="brand" href={href.pools()}>
          <Mark />
          Damper
        </a>
        <nav className="nav" aria-label="Main">
          <a href={href.pools()} aria-current={current === 'pools' ? 'page' : undefined}>
            Pools
          </a>
          <a href={href.method()} aria-current={current === 'method' ? 'page' : undefined}>
            Method
          </a>
          <a href={href.status()} aria-current={current === 'status' ? 'page' : undefined}>
            Oracle status
          </a>
        </nav>
        <button type="button" className="ghost" onClick={cycleTheme}>
          {THEME_LABEL[theme]}
        </button>
      </header>

      <main>
        {route.page === 'method' ? (
          <MethodPage />
        ) : route.page === 'status' ? (
          <OracleStatusPage />
        ) : state.status === 'loading' ? (
          <p className="state" role="status">
            Loading the latest scan…
          </p>
        ) : state.status === 'error' ? (
          <div className="state" role="alert">
            <p>The scan report could not be loaded.</p>
            <p className="muted">{state.message}</p>
          </div>
        ) : (
          <>
            {state.data.source === 'snapshot' && (
              <div className="banner" role="status">
                Showing the scan bundled with this build, from {dateTime(state.data.report.scannedAt)}. The live report could
                not be reached{state.data.liveError ? ` (${state.data.liveError})` : ''}.
              </div>
            )}
            {route.page === 'pool' ? (
              (() => {
                const pool = state.data.report.pools.find((p) => p.id === route.id);
                return pool ? (
                  <PoolPage pool={pool} />
                ) : (
                  <div className="state">
                    <p>No pool with that address in this scan.</p>
                    <p>
                      <a href={href.pools()}>Back to all pools</a>
                    </p>
                  </div>
                );
              })()
            ) : (
              <PoolsPage report={state.data.report} />
            )}
          </>
        )}
      </main>

      <footer className="footer">
        {state.status === 'ready' && (
          <p>
            Scanned {ago(state.data.report.scannedAt)} ({dateTime(state.data.report.scannedAt)}), ledger{' '}
            <span className="num">{state.data.report.ledger.toLocaleString('en-US')}</span> ·{' '}
            {state.data.source === 'live' ? 'live report' : 'bundled snapshot'}
          </p>
        )}
        <p>
          Damper is unaudited and these figures are estimates from public data, not advice. Source:{' '}
          <a href="https://github.com/Dampper/damper-frontend">damper-frontend</a> ·{' '}
          <a href="https://github.com/Dampper/damper-backend">damper-backend</a> ·{' '}
          <a href="https://github.com/Dampper/damper-contracts">damper-contracts</a>
        </p>
      </footer>
    </div>
  );
}
