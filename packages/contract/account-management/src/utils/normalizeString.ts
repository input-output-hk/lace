/**
 * Normalizes a string for comparison by trimming whitespace and lowercasing.
 * Used by `isDuplicateString` and `generateUniqueAccountName` to ensure
 * consistent comparison semantics.
 */
export const normalizeString = (value: string): string =>
  value.trim().toLowerCase();
