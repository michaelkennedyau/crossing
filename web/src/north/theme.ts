/**
 * Bridge day/night theme — the VARO theme contract (data-theme attribute + localStorage +
 * prefers-color-scheme default), scoped in effect to the Bridge overlay by the CSS in the
 * north-bridge entry. The voyage scroll itself stays a night-world.
 */
const THEME_KEY = 'north-theme';

export function initTheme(): void {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === 'light' || saved === 'dark') {
    document.documentElement.setAttribute('data-theme', saved);
  } else if (matchMedia('(prefers-color-scheme: light)').matches) {
    document.documentElement.setAttribute('data-theme', 'light');
  } else {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
}

export function toggleTheme(): string {
  const next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem(THEME_KEY, next);
  return next;
}
