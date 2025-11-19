/**
 * Returns the current Unix timestamp in seconds.
 * This is equivalent to Math.floor(Date.now() / 1000).
 *
 * @returns Current Unix timestamp in seconds
 */
// eslint-disable-next-line no-magic-numbers
export const getNow = (): number => Math.floor(Date.now() / 1000);

/**
 * Type guard that checks if a value is an array of strings.
 *
 * @param value - The value to check
 * @returns True if the value is an array containing only strings, false otherwise
 */
export const isArrayOfStrings = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((element) => typeof element === 'string');

/**
 * A no-op function used as a default callback.
 * Returns undefined and accepts any arguments.
 *
 * @param _args - Any arguments (ignored)
 * @returns undefined
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const unused = (..._args: unknown[]): undefined => void 0;

/**
 * Gets the current PubNub timetoken.
 * PubNub timetokens are in 100-nanosecond units (17 digits).
 * Converts current time in milliseconds to PubNub timetoken format.
 *
 * @returns Current timetoken as a string
 */
export const getCurrentTimetoken = (): string =>
  // eslint-disable-next-line no-magic-numbers
  (Date.now() * 10_000).toString();
