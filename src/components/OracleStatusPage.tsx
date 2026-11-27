import { useEffect, useState } from 'react';
import { ago, dateTime, price, usd } from '../format';
import { anchorAgeSecs, costRatioLabel, evidenceAgeSecs, fixedToNumber, isStatusStale, isTightened, rateSummary } from '../oracleDerive';
import { loadStatus, type LoadedStatus } from '../statusData';
import type { AssetStatus, OracleStatus } from '../types';
import { AlertList } from './AlertList';
import { CopyId } from './CopyId';

type State = { phase: 'loading' } | { phase: 'error'; message: string } | { phase: 'ready'; data: LoadedStatus };

function explorerFor(network: string): string {
  return `https://stellar.expert/explorer/${network === 'testnet' ? 'testnet' : 'public'}/contract/`;
}

function toIso(unixSecs: number): string {
  return new Date(unixSecs * 1000).toISOString();
}

function AssetCard({ asset, network, now }: { asset: AssetStatus; network: string; now: number }) {
  const explorer = explorerFor(network);
  const decimals = asset.decimals;
  const anchorAge = anchorAgeSecs(asset, now);
  const evidenceAge = evidenceAgeSecs(asset, now);
  const tight = isTightened(asset);

  return (
    <div className="card">
      <div className="page-title" style={{ marginBottom: 0 }}>
        <h2 style={{ margin: 0 }}>
          <CopyId id={asset.asset.replace(/^Stellar:/, '')} explorer={explorer} />
        </h2>
        {tight && <span className="chip" data-severity="warn">on the tight rate</span>}
      </div>

      <div className="kpis three">
        <div className="kpi">
          <div className="label">Raw median</div>
          <div className="value num">{price(fixedToNumber(asset.raw, decimals))}</div>
          <div className="sub">before any clamp</div>
        </div>
        <div className="kpi">
          <div className="label">Quote</div>
          <div className="value num">{price(fixedToNumber(asset.quote, decimals))}</div>
          <div className="sub">what a pool reads from lastprice</div>
        </div>
        <div className="kpi">
          <div className="label">Anchor</div>
          <div className="value num">{price(fixedToNumber(asset.anchor?.price, decimals))}</div>
          <div className="sub">{anchorAge === undefined ? 'not seeded' : `moved ${ago(toIso(asset.anchor!.timestamp))}`}</div>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Rate</th>
              <th className="r">Policy</th>
              <th className="r">In force now</th>
              {asset.gate && <th className="r hide-sm">Tight rate</th>}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Clamp</td>
              <td className="r">{rateSummary(asset.policy)}</td>
              <td className="r">{rateSummary(asset.effectivePolicy)}</td>
              {asset.gate && (
                <td className="r hide-sm">
                  {rateSummary({ upBpsPerHour: asset.gate.tightUpBpsPerHour, downBpsPerHour: asset.gate.tightDownBpsPerHour, windowSecs: asset.policy?.windowSecs ?? 0 })}
                </td>
              )}
            </tr>
          </tbody>
        </table>
      </div>

      {asset.gate && (
        <p className="lede">
          Cost gate: keeps the policy rate while fresh evidence says moving the price costs at least {costRatioLabel(asset.gate.minCostRatioBps)} what it would
          unlock; evidence older than {Math.round(asset.gate.maxEvidenceAge / 60)} min counts as missing.{' '}
          {asset.evidence ? (
            <>
              Last evidence ({evidenceAge !== undefined ? ago(toIso(asset.evidence.timestamp)) : 'unknown'}): pushing up costs{' '}
              {usd(fixedToNumber(asset.evidence.upCost, decimals))} against {usd(fixedToNumber(asset.evidence.upExposure, decimals))} it would unlock; down costs{' '}
              {usd(fixedToNumber(asset.evidence.downCost, decimals))} against {usd(fixedToNumber(asset.evidence.downExposure, decimals))}.
            </>
          ) : (
            'No evidence has been published yet.'
          )}
        </p>
      )}

      <h3>Alerts from the last pass</h3>
      <AlertList alerts={asset.alerts} />
    </div>
  );
}

function Loaded({ status, network, now }: { status: OracleStatus; network: string; now: number }) {
  if (status.assets.length === 0) {
    return (
      <div className="state">
        <p>This oracle serves no assets yet, or the last keeper pass could not read it.</p>
      </div>
    );
  }
  return (
    <div className="stack">
      {status.assets.map((a) => (
        <AssetCard key={a.asset} asset={a} network={network} now={now} />
      ))}
    </div>
  );
}

export function OracleStatusPage() {
  const [state, setState] = useState<State>({ phase: 'loading' });

  useEffect(() => {
    const ctl = new AbortController();
    loadStatus(ctl.signal).then(
      (data) => setState({ phase: 'ready', data }),
      (e: Error) => {
        if (!ctl.signal.aborted) setState({ phase: 'error', message: e.message });
      },
    );
    return () => ctl.abort();
  }, []);

  if (state.phase === 'loading') {
    return (
      <p className="state" role="status">
        Loading the oracle's status…
      </p>
    );
  }
  if (state.phase === 'error') {
    return (
      <div className="state" role="alert">
        <p>The oracle's status report could not be loaded.</p>
        <p className="muted">{state.message}</p>
      </div>
    );
  }

  const { status, source, liveError } = state.data;
  const now = Math.floor(Date.now() / 1000);

  return (
    <div className="stack">
      <div>
        <h1>Oracle status</h1>
        <p className="lede">
          What the keeper saw on its last pass against the <span className="chip">{status.network}</span> oracle{' '}
          <CopyId id={status.oracle} explorer={explorerFor(status.network)} />: each asset's raw price before any clamp, the
          quote a pool actually reads, the anchor, and the rate in force right now.
        </p>
      </div>

      {source === 'snapshot' && (
        <div className="banner" role="status">
          Showing the status bundled with this build, from {dateTime(toIso(status.at))}. The live report could not be
          reached{liveError ? ` (${liveError})` : ''}.
        </div>
      )}

      {isStatusStale(status, now) && (
        <div className="banner" data-severity="warn" role="alert">
          This report is {ago(toIso(status.at))}. The keeper may have stopped running; nothing below is more recent than
          that.
        </div>
      )}

      <Loaded status={status} network={status.network} now={now} />

      <p className="muted">
        Last pass {ago(toIso(status.at))} ({dateTime(toIso(status.at))}) · {source === 'live' ? 'live report' : 'bundled snapshot'}
      </p>
    </div>
  );
}
