import { TIER_LABEL, plotRows, ratio, type SideName } from './derive';
import { deviationGuard, sourceLabel } from './components/source';
import type { Pool } from './types';

export type Cell = string | number | undefined | null;

/**
 * One RFC 4180 field. Fields with a comma, quote or line break are quoted, with quotes doubled.
 * A text cell a spreadsheet could read as a formula (leading = + - @, tab or return) gets a leading
 * apostrophe so opening the file cannot run it. Numbers are written as they are.
 */
export function csvField(value: Cell): string {
  if (value === undefined || value === null) return '';
  let text: string;
  if (typeof value === 'number') {
    text = Number.isFinite(value) ? String(value) : '';
  } else {
    text = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  }
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function csvRow(cells: Cell[]): string {
  return cells.map(csvField).join(',');
}

/** Rows joined with CRLF and a closing CRLF; an empty row is a blank line. */
export function toCsv(rows: Cell[][]): string {
  return rows.map(csvRow).join('\r\n') + '\r\n';
}

export const RESERVE_HEADERS = [
  'Reserve',
  'Asset',
  'Price (USD)',
  'Collateral factor',
  'Supplied (USD)',
  'Borrowed (USD)',
  'Price source',
  'Deviation guard',
];

const SIDE_TITLE: Record<SideName, string> = {
  collateral: 'If the price of a collateral asset were pushed up',
  debt: 'If the price of a borrowed asset were pushed down',
};

const SIDE_HEADERS: Record<SideName, string[]> = {
  collateral: [
    'Reserve',
    'Cost to push the price up 10× (USD)',
    'Borrowable from other reserves (USD)',
    'Exposure ÷ cost',
    'Tier',
    'Note',
  ],
  debt: [
    'Reserve',
    'Value to sell to push it down 10× (USD)',
    'Borrowable from this reserve (USD)',
    'Exposure ÷ cost',
    'Tier',
    'Note',
  ],
};

/** The reserves table, as raw numbers. A blank cell is where the page shows a dash. */
export function reserveRows(pool: Pool): Cell[][] {
  return pool.reserves.map((r) => [
    r.symbol,
    r.asset,
    r.priceUsd,
    r.collateralFactor,
    r.priceUsd === undefined ? undefined : r.supplied * r.priceUsd,
    r.priceUsd === undefined ? undefined : r.borrowed * r.priceUsd,
    sourceLabel(r.source),
    deviationGuard(r.source),
  ]);
}

/** One cost-versus-exposure table, with the same blanks and notes as the page's table view. */
export function sideRows(pool: Pool, which: SideName): Cell[][] {
  return plotRows(pool, which).map((r) => [
    r.reserve.symbol,
    r.plottable ? r.side.costUsd : undefined,
    r.side.exposureUsd > 0 ? r.side.exposureUsd : undefined,
    r.plottable ? ratio(r.side) : undefined,
    r.plottable || r.side.tier === 'external' ? TIER_LABEL[r.side.tier] : undefined,
    !r.plottable ? r.reason : undefined,
  ]);
}

/** The pool page's three tables in one file, each under its heading and separated by a blank line. */
export function poolCsv(pool: Pool): string {
  return toCsv([
    ['Pool', pool.name],
    ['Pool ID', pool.id],
    [],
    ['Reserves and where their prices come from'],
    RESERVE_HEADERS,
    ...reserveRows(pool),
    [],
    [SIDE_TITLE.collateral],
    SIDE_HEADERS.collateral,
    ...sideRows(pool, 'collateral'),
    [],
    [SIDE_TITLE.debt],
    SIDE_HEADERS.debt,
    ...sideRows(pool, 'debt'),
  ]);
}

export function poolCsvFilename(pool: Pool): string {
  const slug = pool.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `damper-${slug || 'pool'}-${pool.id.slice(0, 8).toLowerCase()}.csv`;
}
