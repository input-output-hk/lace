/**
 * Parse a WebView URL into the `origin` used to attribute CIP-30 requests and
 * the `hostname` shown in the nav bar.
 *
 * On an unparseable URL it returns the raw string for both fields — the same
 * conservative fallback the CIP-30 authorization lookup already assumes, so an
 * exotic URL degrades to "attribute to this literal string" rather than to a
 * spoofable empty origin. Keep every mobile call site on this one helper: the
 * fallback is security-relevant (it is compared against persisted dApp
 * authorizations), so divergent copies could attribute the same URL differently.
 */
export const safeParseUrl = (
  url: string,
): { origin: string; hostname: string } => {
  try {
    const parsed = new URL(url);
    return { origin: parsed.origin, hostname: parsed.hostname };
  } catch {
    return { origin: url, hostname: url };
  }
};
