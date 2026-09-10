/** Elides the middle of an address or transaction hash. */
export const truncateMiddle = (value: string): string =>
  value.length > 20 ? `${value.slice(0, 12)}…${value.slice(-8)}` : value;
