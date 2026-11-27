import { TIER_LABEL, findings, summarise, visiblePools, type Filter } from '../derive';
import { usd } from '../format';
import { href, navigate, useRoute } from '../router';
import type { Report } from '../types';
import { Kpi } from './Kpi';
import { TierBadge } from './TierBadge';
import { sourceLabels } from './source';

export function PoolsPage({ report }: { report: Report }) {
  const route = useRoute();
  // Reached only while on the pools page (App renders PoolsPage for that route alone), but
  // the type is the general Route, so fall back to 'all' for the other variants.
  const filter: Filter = route.page === 'pools' ? route.filter : 'all';
  const setFilter = (next: Filter) => navigate(href.pools(next));
  const sum = summarise(report);
  const pools = visiblePools(report, filter);
  const notable = findings(report);

  return (
    <div className="stack">
      <div className="page-title">
        <h1>Pool risk</h1>
        <p>
          How cheaply each Blend lending pool on Stellar could be drained through a manipulated price, measured from live
          pool state and the Stellar DEX order book.
        </p>
      </div>

      <div className="kpis">
        <Kpi label="Pools scanned" value={sum.pools} sub={`${sum.borrowingOpen} open for borrowing`} />
        <Kpi label="Supplied" value={usd(sum.supplyUsd)} sub="across all pools" />
        <Kpi label="Borrowed" value={usd(sum.borrowedUsd)} sub="outstanding debt" />
        <Kpi
          label="Highest tier, borrowing open"
          value={sum.worstOpenTier ? <TierBadge tier={sum.worstOpenTier} /> : 'None open'}
          sub={
            sum.worstOpenPool
              ? sum.worstOpenTier === 'external'
                ? `${sum.worstOpenPool.name}: priced off the Stellar DEX`
                : sum.worstOpenPool.name
              : 'no pool allows borrowing'
          }
        />
      </div>

      <div className="card">
        <div className="filters">
          <h2 style={{ marginRight: 'auto' }}>Pools</h2>
          <div className="segmented" role="group" aria-label="Which pools to show">
            <button type="button" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>
              All ({report.pools.length})
            </button>
            <button type="button" aria-pressed={filter === 'open'} onClick={() => setFilter('open')}>
              Borrowing open ({sum.borrowingOpen})
            </button>
          </div>
        </div>

        {pools.length === 0 ? (
          <p className="muted" style={{ padding: '16px 0' }}>
            No pool allows borrowing right now.
          </p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Pool</th>
                  <th>Status</th>
                  <th className="r">Supplied</th>
                  <th className="r">Borrowed</th>
                  <th className="hide-sm">Price sources</th>
                  <th>Highest tier</th>
                </tr>
              </thead>
              <tbody>
                {pools.map((p) => (
                  <tr key={p.id} className="link">
                    <td>
                      <a className="cell-title" href={href.pool(p.id)}>
                        {p.name}
                      </a>
                      <div className="muted mono">{p.id.slice(0, 8)}…</div>
                    </td>
                    <td>
                      <span className="chip" title={p.borrowingOpen ? 'New borrows are possible' : 'New borrows are not possible'}>
                        {p.status}
                      </span>
                    </td>
                    <td className="r">{usd(p.supplyUsd)}</td>
                    <td className="r">{usd(p.borrowedUsd)}</td>
                    <td className="hide-sm">
                      <div className="chips">
                        {sourceLabels(p.reserves).map((l) => (
                          <span key={l} className="chip">
                            {l}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <TierBadge tier={p.tier} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="muted" style={{ marginTop: 12, fontSize: 13 }}>
          Tiers compare what an attacker could borrow with the capital needed to move the price.{' '}
          <a href={href.method()}>How it is measured</a>. &ldquo;{TIER_LABEL.external}&rdquo; means the price does not come
          from the Stellar DEX, so a trade there cannot move it.
        </p>
      </div>

      {notable.length > 0 && (
        <div className="card">
          <h2>What stands out</h2>
          <p className="lede">Patterns in how these pools get their prices that the pools themselves cannot see.</p>
          <div className="findings">
            {notable.map((f) => (
              <div className="finding" key={f.id}>
                <h3>
                  {f.title} <span className="muted num">({f.items.length})</span>
                </h3>
                <p>{f.detail}</p>
                <ul>
                  {f.items.map(({ pool, reserve }) => (
                    <li key={`${pool.id}-${reserve.asset}`}>
                      <a href={href.pool(pool.id)}>
                        {pool.name} · {reserve.symbol}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {report.errors.length > 0 && (
        <details className="muted">
          <summary>
            {report.errors.length} registered {report.errors.length === 1 ? 'pool' : 'pools'} could not be scanned
          </summary>
          <ul className="mono" style={{ margin: '8px 0 0', paddingLeft: 18 }}>
            {report.errors.map((e) => (
              <li key={e.pool}>
                {e.pool.slice(0, 8)}…: {e.error.split('\n')[0]?.slice(0, 120)}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
