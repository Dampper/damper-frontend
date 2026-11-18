import { useCallback, useEffect, useState } from 'react';

export type Theme = 'system' | 'light' | 'dark';
const KEY = 'damper-theme';

function read(): Theme {
  const asked = new URLSearchParams(window.location.search).get('theme');
  if (asked === 'light' || asked === 'dark') return asked;
  try {
    const v = window.localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}

/** Follows the OS unless the viewer picks; the choice is remembered when storage allows it. */
export function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(read);
  useEffect(() => {
    const el = document.documentElement;
    if (theme === 'system') el.removeAttribute('data-theme');
    else el.setAttribute('data-theme', theme);
  }, [theme]);
  const cycle = useCallback(() => {
    setTheme((t) => {
      const next: Theme = t === 'system' ? 'light' : t === 'light' ? 'dark' : 'system';
      try {
        if (next === 'system') window.localStorage.removeItem(KEY);
        else window.localStorage.setItem(KEY, next);
      } catch {
        /* storage blocked: the choice lasts for this visit */
      }
      return next;
    });
  }, []);
  return [theme, cycle];
}
