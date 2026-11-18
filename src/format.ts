/** Dollar amounts: $1.23M, $45.6k, $789. Under $1 keeps cents. */
export function usd(n: number | undefined): string {
  if (n === undefined || !Number.isFinite(n)) return '—';
  const a = Math.abs(n);
  const sign = n < 0 ? '−' : '';
  if (a >= 1e9) return `${sign}$${trim(a / 1e9, a >= 1e10 ? 1 : 2)}B`;
  if (a >= 1e6) return `${sign}$${trim(a / 1e6, a >= 1e7 ? 1 : 2)}M`;
  if (a >= 1e3) return `${sign}$${trim(a / 1e3, a >= 1e5 ? 0 : 1)}k`;
  if (a >= 1) return `${sign}$${Math.round(a).toLocaleString('en-US')}`;
  if (a === 0) return '$0';
  return `${sign}$${a.toFixed(2)}`;
}

function trim(n: number, digits: number): string {
  const s = n.toFixed(digits);
  return s.includes('.') ? s.replace(/\.?0+$/, '') : s;
}

/** Axis tick for a power of ten: $10, $1k, $10M. */
export function usdTick(n: number): string {
  return usd(n);
}

/** A multiple such as 12×, 0.4×, 1.2k×. */
export function multiple(ratio: number | undefined): string {
  if (ratio === undefined || !Number.isFinite(ratio)) return '—';
  if (ratio >= 1000) return `${trim(ratio / 1000, 1)}k×`;
  if (ratio >= 10) return `${Math.round(ratio)}×`;
  if (ratio >= 1) return `${ratio.toFixed(1)}×`;
  if (ratio >= 0.01) return `${ratio.toFixed(2)}×`;
  return '<0.01×';
}

export function percent(fraction: number, digits = 0): string {
  return `${(fraction * 100).toFixed(digits)}%`;
}

export function price(n: number | undefined): string {
  if (n === undefined) return '—';
  if (n >= 100) return `$${n.toFixed(2)}`;
  if (n >= 0.01) return `$${n.toFixed(n >= 1 ? 3 : 4)}`;
  return `$${n.toPrecision(2)}`;
}

/** 'CABC…WXYZ' */
export function shortId(id: string): string {
  return id.length <= 12 ? id : `${id.slice(0, 5)}…${id.slice(-4)}`;
}

export function ago(iso: string, now: number = Date.now()): string {
  const secs = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  if (secs < 90) return 'just now';
  const mins = Math.round(secs / 60);
  if (mins < 90) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 36) return `${hours} h ago`;
  return `${Math.round(hours / 24)} days ago`;
}

export function dateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }) + ' UTC';
}
