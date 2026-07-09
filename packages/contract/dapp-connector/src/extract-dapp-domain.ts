/**
 * Reduces a `Dapp.origin` to its bare hostname (e.g.
 * `'https://app.minswap.org'` → `'app.minswap.org'`) for analytics
 * payloads. Full origins include scheme and port, which inflate
 * dashboard cardinality without adding analytic value, and may carry
 * query/fragment in malformed inputs. Returns the input unchanged when
 * URL parsing fails so analytics can still report something.
 */
export const extractDappDomain = (origin: string): string => {
  try {
    return new URL(origin).hostname;
  } catch {
    return 'unknown';
  }
};
