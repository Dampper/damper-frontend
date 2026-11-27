import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { AlertList } from '../src/components/AlertList';
import { ALERT_CODES, alertCodeInfo } from '../src/components/alertCodes';
import type { Alert } from '../src/types';

afterEach(cleanup);

// Every code decide() (damper-backend src/keeper/decide.ts) can push into AssetStatus.alerts.
const KEEPER_CODES = [
  'no-policy',
  'unseeded',
  'no-quote',
  'anchor-stale',
  'clamp-binding',
  'suspicious-move',
  'hold-expired',
  'evidence-stale',
  'gate-tight',
];

describe('alertCodes (#23)', () => {
  it('covers every code the keeper emits, each with a real explanation and response', () => {
    for (const code of KEEPER_CODES) {
      expect(Object.keys(ALERT_CODES), code).toContain(code);
      const info = alertCodeInfo(code);
      expect(info.explanation.length, code).toBeGreaterThan(20);
      expect(info.response.length, code).toBeGreaterThan(10);
    }
  });

  it('falls back to a generic entry for a code it does not recognize, rather than throwing', () => {
    expect(() => alertCodeInfo('something-new')).not.toThrow();
    const info = alertCodeInfo('something-new');
    expect(info.explanation).toBeTruthy();
    expect(info.response).toBeTruthy();
  });
});

const alert = (code: string, overrides: Partial<Alert> = {}): Alert => ({
  severity: 'warn',
  code,
  message: `${code} message`,
  ...overrides,
});

describe('AlertList renders the explanation and response', () => {
  it("shows every keeper code's explanation as the chip's title and its response as visible text", () => {
    render(<AlertList alerts={KEEPER_CODES.map((code) => alert(code))} />);

    for (const code of KEEPER_CODES) {
      const chip = screen.getByText(code, { selector: '.chip' });
      expect(chip.getAttribute('title')).toBe(ALERT_CODES[code]!.explanation);
      expect(screen.getByText(ALERT_CODES[code]!.response)).toBeTruthy();
    }
  });

  it('still renders something sensible for a code with no entry', () => {
    render(<AlertList alerts={[alert('future-code')]} />);

    expect(screen.getByText('future-code')).toBeTruthy();
    expect(screen.getByText(/not yet documented/)).toBeTruthy();
  });

  it('keeps the empty-state message when there are no alerts', () => {
    render(<AlertList alerts={[]} />);
    expect(screen.getByText(/nothing to report/i)).toBeTruthy();
  });
});
