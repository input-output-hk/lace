/** The longest delay a timer honours; a longer one, or `Infinity`, fires at once. */
export const MAX_TIMEOUT_MS = 2 ** 31 - 1;

/**
 * Applies a timeout option's default and refuses a value no timer can honour:
 * not a finite positive number of milliseconds, or above `MAX_TIMEOUT_MS`.
 */
export const resolveTimeoutMs = (
  name: string,
  value: number | undefined,
  fallback: number,
): number => {
  const resolved = value ?? fallback;
  if (
    typeof resolved !== 'number' ||
    !Number.isFinite(resolved) ||
    resolved <= 0 ||
    resolved > MAX_TIMEOUT_MS
  ) {
    throw new RangeError(
      `${name} must be a positive number of milliseconds up to ${MAX_TIMEOUT_MS}; got ${String(
        resolved,
      )}`,
    );
  }
  return resolved;
};
