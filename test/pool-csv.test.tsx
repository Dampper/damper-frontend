import { readFileSync } from 'node:fs';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PoolPage } from '../src/components/PoolPage';
import { csvField, csvRow, poolCsv, poolCsvFilename, reserveRows, toCsv } from '../src/csv';
import { downloadText } from '../src/download';
import { plotRows, ratio } from '../src/derive';
import { multiple, usd } from '../src/format';
import { parseReport } from '../src/report';

const report = parseReport(JSON.parse(readFileSync('public/data/latest.json', 'utf8')));
const pool = report.pools.find((p) => p.name === 'YieldBlox on ice')!;

/** Minimal RFC 4180 reader, so the tests check what a spreadsheet would see. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\r' && text[i + 1] === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      i++;
    } else field += c;
  }
  return rows;
}

describe('csvField escaping', () => {
  it('quotes fields with commas, quotes and line breaks, doubling the quotes', () => {
    expect(csvField('plain')).toBe('plain');
    expect(csvField('a,b')).toBe('"a,b"');
    expect(csvField('say "hi"')).toBe('"say ""hi"""');
    expect(csvField('two\nlines')).toBe('"two\nlines"');
    expect(csvField('two\r\nlines')).toBe('"two\r\nlines"');
  });

  it('stops a spreadsheet reading a text cell as a formula', () => {
    for (const bad of ['=SUM(A1:A9)', '+1', '-1', '@cmd', '\tx', '\rx']) {
      expect(csvField(bad).replace(/^"/, '').startsWith("'")).toBe(true);
    }
    expect(csvField('=HYPERLINK("http://x","y")')).toBe('"\'=HYPERLINK(""http://x"",""y"")"');
  });

  it('writes numbers as they are, blanks for missing values and for numbers that are not finite', () => {
    expect(csvField(-5.25)).toBe('-5.25');
    expect(csvField(0)).toBe('0');
    expect(csvField(undefined)).toBe('');
    expect(csvField(null)).toBe('');
    expect(csvField(Number.NaN)).toBe('');
    expect(csvField(Number.POSITIVE_INFINITY)).toBe('');
  });

  it('joins rows with CRLF and keeps an empty row as a blank line', () => {
    expect(csvRow(['a', 1, undefined, 'b,c'])).toBe('a,1,,"b,c"');
    expect(toCsv([['a'], [], ['b']])).toBe('a\r\n\r\nb\r\n');
  });
});

describe('poolCsv', () => {
  const table = parseCsv(poolCsv(pool));
  const sectionAt = (title: string) => table.findIndex((r) => r[0] === title);

  it('has the pool, then the reserves table and both cost tables under their headings', () => {
    expect(table[0]).toEqual(['Pool', pool.name]);
    expect(table[1]).toEqual(['Pool ID', pool.id]);
    expect(sectionAt('Reserves and where their prices come from')).toBeGreaterThan(0);
    expect(sectionAt('If the price of a collateral asset were pushed up')).toBeGreaterThan(0);
    expect(sectionAt('If the price of a borrowed asset were pushed down')).toBeGreaterThan(0);
  });

  it('writes one row per reserve in each table, in the same order as the page', () => {
    for (const [title, which] of [
      ['If the price of a collateral asset were pushed up', 'collateral'],
      ['If the price of a borrowed asset were pushed down', 'debt'],
    ] as const) {
      const start = sectionAt(title) + 2;
      const rows = table.slice(start, start + pool.reserves.length);
      expect(rows.map((r) => r[0])).toEqual(plotRows(pool, which).map((r) => r.reserve.symbol));
    }
    const first = sectionAt('Reserves and where their prices come from') + 2;
    expect(table.slice(first, first + pool.reserves.length).map((r) => r[0])).toEqual(pool.reserves.map((r) => r.symbol));
  });

  it('gives every row the same number of cells as its header', () => {
    for (const title of [
      'Reserves and where their prices come from',
      'If the price of a collateral asset were pushed up',
      'If the price of a borrowed asset were pushed down',
    ]) {
      const at = sectionAt(title);
      const width = table[at + 1]!.length;
      for (const row of table.slice(at + 2, at + 2 + pool.reserves.length)) expect(row).toHaveLength(width);
    }
  });

  it('keeps raw numbers that the page shows rounded, and blanks where the page shows a dash', () => {
    const rows = reserveRows(pool);
    for (const [i, r] of pool.reserves.entries()) {
      expect(rows[i]![2]).toBe(r.priceUsd);
      if (r.priceUsd === undefined) expect(rows[i]![4]).toBeUndefined();
    }
    const collateral = plotRows(pool, 'collateral');
    const at = sectionAt('If the price of a collateral asset were pushed up') + 2;
    collateral.forEach((r, i) => {
      const cells = table[at + i]!;
      expect(cells[1] === '' ? '—' : usd(Number(cells[1]))).toBe(r.plottable ? usd(r.side.costUsd) : '—');
      expect(cells[3] === '' ? '—' : multiple(Number(cells[3]))).toBe(r.plottable ? multiple(ratio(r.side)) : '—');
      if (!r.plottable) expect(cells[5]).toBe(r.reason);
    });
  });

  it('escapes a pool name and a note that would break or inject into a spreadsheet', () => {
    const nasty = structuredClone(pool);
    nasty.name = '=cmd|"/c calc",x';
    nasty.reserves[0]!.symbol = '@evil';
    const rows = parseCsv(poolCsv(nasty));
    expect(rows[0]).toEqual(['Pool', `'=cmd|"/c calc",x`]);
    expect(rows.some((r) => r[0] === "'@evil")).toBe(true);
  });

  it('builds a file name from the pool name and the start of its id', () => {
    expect(poolCsvFilename(pool)).toBe(`damper-yieldblox-on-ice-${pool.id.slice(0, 8).toLowerCase()}.csv`);
    expect(poolCsvFilename({ ...pool, name: '???' })).toMatch(/^damper-pool-/);
  });
});

describe('Download CSV button', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        disconnect() {}
        unobserve() {}
      },
    );
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('offers the pool as a CSV file', async () => {
    const blobs: Blob[] = [];
    URL.createObjectURL = vi.fn((b: Blob) => (blobs.push(b), 'blob:test'));
    URL.revokeObjectURL = vi.fn();
    const clicked: { download: string; href: string }[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clicked.push({ download: this.download, href: this.href });
    });

    render(<PoolPage pool={pool} />);
    fireEvent.click(screen.getByRole('button', { name: 'Download CSV' }));

    expect(clicked).toEqual([{ download: poolCsvFilename(pool), href: 'blob:test' }]);
    expect(await blobs[0]!.text()).toBe('﻿' + poolCsv(pool));
  });

  it('writes the text it is given with a UTF-8 byte order mark', async () => {
    const blobs: Blob[] = [];
    URL.createObjectURL = vi.fn((b: Blob) => (blobs.push(b), 'blob:x'));
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    downloadText('a.csv', 'Exposure ÷ cost');

    expect(await blobs[0]!.text()).toBe('﻿Exposure ÷ cost');
    expect(blobs[0]!.type).toBe('text/csv;charset=utf-8');
  });
});
