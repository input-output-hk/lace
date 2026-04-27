import { normalizeString } from './normalizeString';

/**
 * Checks if a string already exists in a list of existing strings.
 * Comparison is case-insensitive and trimmed.
 *
 * @param value - The string to check
 * @param existingValues - List of strings to check against
 * @param excludeValue - Optional string to exclude from comparison (used in rename flows to skip the current value)
 */
export const isDuplicateString = (
  value: string,
  existingValues: string[],
  excludeValue?: string,
): boolean => {
  const normalizedValue = normalizeString(value);

  if (!normalizedValue) return false;

  const normalizedExclude = excludeValue
    ? normalizeString(excludeValue)
    : undefined;

  return existingValues.some(existing => {
    const normalized = normalizeString(existing);
    return normalized !== normalizedExclude && normalized === normalizedValue;
  });
};
