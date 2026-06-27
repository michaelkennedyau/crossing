/**
 * Parse NOAA CPC's ONI ascii table. Columns: SEAS  YR  TOTAL  ANOM. The last data row's ANOM is the
 * current Oceanic Niño Index — the model's default ENSO state. Falls back to +1.5 (the developing
 * El Niño the design assumes) if the feed can't be read.
 */
export interface OniReading {
  oni: number;
  season: string;
  year: string;
}

export function parseLatestOni(text: string): OniReading {
  const rows = text
    .trim()
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !/^SEAS/i.test(l));
  const last = rows[rows.length - 1] ?? '';
  const parts = last.split(/\s+/);
  const anom = Number.parseFloat(parts[3] ?? '');
  return {
    oni: Number.isFinite(anom) ? anom : 1.5,
    season: parts[0] ?? '',
    year: parts[1] ?? '',
  };
}
