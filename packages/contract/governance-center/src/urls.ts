/**
 * CIP-119 reference uris are frequently scheme-less (`www.example.com`);
 * Linking.openURL would resolve those relative to the app page on web.
 * They are also arbitrary on-chain metadata anyone can register, so only
 * http/https/mailto may reach Linking.openURL — anything else
 * (javascript:, intent:, file:, …) is refused.
 */
export const toExternalUrl = (uri: string): string | undefined => {
  if (!/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(uri)) return `https://${uri}`;
  return /^(https?|mailto):/i.test(uri) ? uri : undefined;
};

/**
 * CIP-119 image uris are attacker-registerable on-chain metadata rendered by
 * an <Avatar/> on view. Only explicit http(s) urls are allowed through; any
 * other scheme — and scheme-less values — are refused so a DRep entry cannot
 * auto-fetch `file:`/`data:`/arbitrary hosts and fingerprint wallet users by
 * IP/timing. Returns `undefined` (icon fallback) for anything rejected.
 */
export const toHttpImageUrl = (uri: string | undefined): string | undefined => {
  if (uri === undefined) return undefined;
  return /^https?:\/\//i.test(uri) ? uri : undefined;
};
