/**
 * Formats pool ticker from pool ID
 * @param poolId - The pool ID to format
 * @param poolTicker - Optional existing pool ticker
 * @returns Formatted pool ticker (first 4 characters uppercase)
 */
export const formatPoolTicker = (
  poolId?: string,
  poolTicker?: string,
): string => {
  return poolTicker || (poolId ? poolId.substring(0, 4).toUpperCase() : '');
};

/**
 * Formats avatar fallback from pool ticker
 * @param poolTicker - The pool ticker to format
 * @returns Formatted avatar fallback (first 2 characters uppercase)
 */
export const formatPoolAvatarFallback = (poolTicker: string): string => {
  return poolTicker ? poolTicker.substring(0, 2).toUpperCase() : '';
};
