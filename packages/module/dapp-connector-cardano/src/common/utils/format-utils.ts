/**
 * Truncates a hash string for display, showing only the first and last few characters.
 *
 * @param hash - The full hash string
 * @param prefixLength - Number of characters to show at the start (default: 8)
 * @param suffixLength - Number of characters to show at the end (default: 8)
 * @returns Truncated hash string with ellipsis in the middle
 */
export const truncateHash = (
  hash: string,
  prefixLength = 8,
  suffixLength = 8,
): string => {
  if (hash.length <= prefixLength + suffixLength + 3) {
    return hash;
  }
  return `${hash.slice(0, prefixLength)}...${hash.slice(-suffixLength)}`;
};
