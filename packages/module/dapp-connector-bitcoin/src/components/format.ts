const SATS_PER_BTC = 100_000_000;

/**
 * Truncates a Bitcoin address (or other hash-like string) for display,
 * showing only the first and last few characters.
 */
export const truncateAddress = (
  address: string,
  prefixLength = 8,
  suffixLength = 8,
): string => {
  if (address.length <= prefixLength + suffixLength + 3) {
    return address;
  }
  return `${address.slice(0, prefixLength)}...${address.slice(-suffixLength)}`;
};

/**
 * Formats a satoshi amount as a signed BTC string, e.g. -150000 -> '-0.0015'.
 * Always shows a sign so a balance-change row reads unambiguously as a spend
 * or a receive.
 */
export const formatSignedSatsAsBtc = (sats: number): string => {
  const sign = sats < 0 ? '-' : '+';
  const btc = Math.abs(sats) / SATS_PER_BTC;
  const formatted = btc.toLocaleString(undefined, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 8,
  });
  return `${sign}${formatted}`;
};

/**
 * Formats a satoshi amount for plain (unsigned) display, e.g. as a fee or a
 * per-input/output value.
 */
export const formatSats = (sats: number): string => sats.toLocaleString();
