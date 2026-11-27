import { poolCsv, poolCsvFilename } from '../csv';
import { plotRows } from '../derive';
import { downloadText } from '../download';
import { percent, price, shortId, usd } from '../format';
import { href } from '../router';
import type { Pool } from '../types';
import { CopyId } from './CopyId';
import { CostChart } from './CostChart';
import { GlossaryTerm } from './GlossaryTerm';
import { Kpi } from './Kpi';
import { TierBadge } from './TierBadge';
import { deviationGuard, sourceLabel } from './source';

export function PoolPage({ pool }: { pool: Pool }) {
  const util = pool.supplyUsd > 0 ? pool.borrowedUsd / pool.supplyUsd : 0;
  const reservesWithNotes = pool.reserves.filter((r) => r.notes.length > 0);

  return (
    <div className="stack">
      <div>
        <div className="crumbs">
          <a href={href.pools()}>← All pools</a>
        </div>
        <div className="page-title" style={{ marginBottom: 0 }}>
          <h1>{pool.name}</h1>
          <TierBadge tier={pool.tier} />
          <span className="chip">{pool.status}</span>
        </div>
        <div className="meta">
          <span>
            Pool <CopyId id={pool.id} />
          </span>
          <span>
            Oracle <CopyId id={pool.oracle} />
          </span>
          <button type="button" className="ghost" onClick={() => downloadText(poolCsvFilename(pool), poolCsv(pool))}>
            Download CSV
          </button>
        </div>
      </div>

      <div className="kpis three">
        <Kpi label="Supplied" value={usd(pool.supplyUsd)} />
        <Kpi label="Borrowed" value={usd(pool.borrowedUsd)} />
        <Kpi label="Utilisation" value={percent(util)} sub={pool.borrowingOpen ? 'borrowing open' : 'borrowing closed'} />
      </div>

      <div className="card">
        <h2>Reserves and where their prices come from</h2>
        <p className="lede">
          Each reserve is priced by one upstream feed. What that feed is decides whether a trade on the Stellar DEX can move
          the price the pool reads.
        </p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Reserve</th>
                <th className="r">Price</th>
                <th className="r hide-sm">Collateral factor</th>
                <th className="r">Supplied</th>
                <th className="r hide-sm">Borrowed</th>
                <th>Price source</th>
                <th className="hide-sm" title="The oracle aggregator rejects a price that moved more than this since the previous round">
                  <GlossaryTerm term="deviation-guard">Deviation guard</GlossaryTerm>
                </th>
              </tr>
            </thead>
            <tbody>
              {pool.reserves.map((r) => (
                <tr key={r.asset}>
                  <td>
                    <span className="cell-title">{r.symbol}</span>
                    <div className="muted mono">{shortId(r.asset)}</div>
                  </td>
                  <td className="r">{price(r.priceUsd)}</td>
                  <td className="r hide-sm">{r.collateralFactor > 0 ? percent(r.collateralFactor) : 'not collateral'}</td>
                  <td className="r">{usd(r.priceUsd === undefined ? undefined : r.supplied * r.priceUsd)}</td>
                  <td className="r hide-sm">{usd(r.priceUsd === undefined ? undefined : r.borrowed * r.priceUsd)}</td>
                  <td>
                    <span className="chip">{sourceLabel(r.source)}</span>
                  </td>
                  <td className="hide-sm">{deviationGuard(r.source)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h2>If the price of a collateral asset were pushed up</h2>
        <p className="lede">
          An attacker posts the asset as collateral at the false price and borrows everything else. The dots compare the{' '}
          <GlossaryTerm term="cost-to-move">capital needed to push the price up 10×</GlossaryTerm> with what the other reserves could lend (the{' '}
          <GlossaryTerm term="exposure">exposure</GlossaryTerm>). Where the orange dot is to the right of the blue one, the prize is bigger than the cost.
        </p>
        <CostChart rows={plotRows(pool, 'collateral')} which="collateral" />
      </div>

      <div className="card">
        <h2>If the price of a borrowed asset were pushed down</h2>
        <p className="lede">
          An attacker makes the asset look cheap and borrows far more of it than their collateral should allow. The dots compare
          the value that has to be sold to push the price down 10× with what this reserve could lend.
        </p>
        <CostChart rows={plotRows(pool, 'debt')} which="debt" />
      </div>

      {reservesWithNotes.length > 0 && (
        <div className="card">
          <h2>Notes from the scan</h2>
          <ul className="notes" style={{ marginTop: 12 }}>
            {reservesWithNotes.map((r) => (
              <li key={r.asset}>
                <b>{r.symbol}</b>: {r.notes.join('. ')}.
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
