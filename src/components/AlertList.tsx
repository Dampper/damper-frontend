import type { Alert } from '../types';
import { severityRank } from '../oracleDerive';
import { SeverityIcon } from './icons';

export function AlertList({ alerts }: { alerts: Alert[] }) {
  if (alerts.length === 0) {
    return <p className="muted">Nothing to report. No clamp is binding and no evidence is stale.</p>;
  }
  const sorted = [...alerts].sort((a, b) => severityRank(a.severity) - severityRank(b.severity));
  return (
    <ul className="alerts">
      {sorted.map((a, i) => (
        <li key={i} data-severity={a.severity}>
          <SeverityIcon severity={a.severity} />
          <div>
            <span className="chip">{a.code}</span> {a.message}
          </div>
        </li>
      ))}
    </ul>
  );
}
