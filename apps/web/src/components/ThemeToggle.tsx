import { useState } from 'react';

/** Read the currently applied theme from the document element. */
function current(): 'light' | 'dark' {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

/** Toggles between light and dark mode, persisting the choice in localStorage. */
export function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>(current);

  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark';
    if (next === 'dark') {
      document.documentElement.dataset.theme = 'dark';
    } else {
      delete document.documentElement.dataset.theme;
    }
    localStorage.setItem('bolpay.theme', next);
    setTheme(next);
  }

  return (
    <button
      type="button"
      className="topbar__bell"
      onClick={toggle}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  );
}
