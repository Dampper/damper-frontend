import type { Tier } from '../types';

/** The Damper mark: a price line whose swings shrink until it settles. */
export function Mark() {
  return (
    <svg viewBox="0 0 1024 1024" aria-hidden="true">
      <rect width="1024" height="1024" fill="#0B1220" />
      <polyline
        points="130,559.5 215,249.5 310,774.5 405,424.5 500,629.5 595,529.5 680,559.5"
        fill="none"
        stroke="#F4F7FB"
        strokeWidth="30"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line x1="680" y1="559.5" x2="880" y2="559.5" stroke="#4FD1B5" strokeWidth="30" strokeLinecap="round" />
      <circle cx="880" cy="559.5" r="28.5" fill="#4FD1B5" />
    </svg>
  );
}

/** One glyph per tier, so the tier never rests on colour alone. */
export function TierIcon({ tier }: { tier: Tier }) {
  const common = { viewBox: '0 0 16 16', 'aria-hidden': true, fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
  switch (tier) {
    case 'critical':
      return (
        <svg {...common}>
          <path d="M5.2 1.8h5.6l3.4 3.4v5.6l-3.4 3.4H5.2L1.8 10.8V5.2z" fill="currentColor" fillOpacity="0.18" />
          <path d="M8 4.8v3.9M8 11v.1" />
        </svg>
      );
    case 'high':
      return (
        <svg {...common}>
          <path d="M8 2 14.5 13.5h-13z" fill="currentColor" fillOpacity="0.18" />
          <path d="M8 6.6v3.2M8 11.9v.1" />
        </svg>
      );
    case 'medium':
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="6.2" fill="currentColor" fillOpacity="0.18" />
          <path d="M5.2 8h5.6" />
        </svg>
      );
    case 'low':
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="6.2" fill="currentColor" fillOpacity="0.18" />
          <path d="m5.3 8.2 1.9 1.9 3.5-3.9" />
        </svg>
      );
    case 'external':
      return (
        <svg {...common}>
          <path d="M6.5 3H3.2v9.8H13V9.5M9 3h4v4M13 3 7.6 8.4" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <path d="M4 8h8" />
        </svg>
      );
  }
}
