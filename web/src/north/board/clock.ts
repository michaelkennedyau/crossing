/**
 * The wall's clock maths — pure and tested. The outlook regenerates every 3 hours on a UTC
 * cron (wrangler.jsonc triggers); the HUD shows the next boundary.
 */
export function nextOutlookRefresh(now: number = Date.now()): Date {
  const d = new Date(now);
  d.setUTCMinutes(0, 0, 0);
  d.setUTCHours(Math.floor(d.getUTCHours() / 3) * 3 + 3);
  return d;
}
