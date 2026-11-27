import type { Alert } from '../types';
import { severityRank } from '../oracleDerive';
import { alertCodeInfo } from './alertCodes';
import { SeverityIcon } from './icons';

export function AlertList({ alerts }: { alerts: Alert[] }) {
  if (alerts.length === 0) {
    return <p className="muted">Nothing to report. No clamp is binding and no evidence is stale.</p>;
  }
  const sorted = [...alerts].sort((a, b) => severityRank(a.severity) - severityRank(b.severity));
  return (
    <ul className="alerts">
      {sorted.map((a, i) => {
        const info = alertCodeInfo(a.code);
        return (
          <li key={i} data-severity={a.severity}>
            <SeverityIcon severity={a.severity} />
            <div>
              <span className="chip" title={info.explanation}>
                {a.code}
              </span>{' '}
              {a.message}
              <p className="muted alert-response">{info.response}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
