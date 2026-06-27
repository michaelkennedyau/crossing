/**
 * Cache-aside helper (mirrors the get→parse→else-fetch→put-with-TTL pattern in
 * brain/src/routes/dashboard.ts). Reads never block on the cache write; a parse miss falls through.
 * Live-data routes use this so they never block paint and never hammer upstream APIs.
 */
export async function cached<T>(
  kv: KVNamespace,
  key: string,
  ttlSeconds: number,
  produce: () => Promise<T>,
): Promise<{ value: T; cached: boolean }> {
  const hit = await kv.get(key, 'json').catch(() => null);
  if (hit !== null) return { value: hit as T, cached: true };

  const value = await produce();
  // best-effort; never block the response on the cache write
  kv.put(key, JSON.stringify(value), { expirationTtl: ttlSeconds }).catch(() => {});
  return { value, cached: false };
}
