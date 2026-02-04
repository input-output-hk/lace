/**
 * Returns the current Unix timestamp in seconds.
 * This is equivalent to Math.floor(Date.now() / 1000).
 *
 * @returns Current Unix timestamp in seconds
 */
// eslint-disable-next-line no-magic-numbers
export const getNow = (): number => Math.floor(Date.now() / 1000);
