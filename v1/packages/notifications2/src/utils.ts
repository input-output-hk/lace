/**
 * Returns the current Unix timestamp in seconds.
 * This is equivalent to Math.floor(Date.now() / 1000).
 *
 * @returns Current Unix timestamp in seconds
 */
// eslint-disable-next-line no-magic-numbers
export const getNow = (): number => Math.floor(Date.now() / 1000);

// eslint-disable-next-line no-magic-numbers
const PUBNUB_TIMETOKEN_MULTIPLIER = 10_000;

/**
 * Converts milliseconds to PubNub timetoken format.
 * PubNub timetokens are 17-digit numbers representing tenths of microseconds since Unix epoch.
 *
 * @param milliseconds - Timestamp in milliseconds (e.g., from Date.now())
 * @returns PubNub timetoken as string (17 digits)
 */
export const toPubNubTimetoken = (milliseconds: number): string =>
  (milliseconds * PUBNUB_TIMETOKEN_MULTIPLIER).toString();

/**
 * Converts a PubNub timetoken to milliseconds.
 *
 * @param timetoken - PubNub timetoken string
 * @returns Timestamp in milliseconds
 */
export const fromPubNubTimetoken = (timetoken: string): number =>
  Number(timetoken) / PUBNUB_TIMETOKEN_MULTIPLIER;
