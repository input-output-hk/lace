import { isRetriableError } from '@lace-lib/util-provider';

const sleep = async (ms: number) =>
  new Promise(resolve => setTimeout(resolve, ms));

export const POLL_TRIES = 60;
export const POLL_DELAY_MS = 5000;

/**
 * Polls `check` up to POLL_TRIES times, POLL_DELAY_MS apart. Returns true if
 * `check` passes within the tries, false otherwise. A retriable provider error
 * from `check` counts as a failed attempt rather than aborting, so a transient
 * Blockfrost hiccup does not fail the run. With `timeoutError` set, throws that
 * message on exhaustion instead of returning false.
 */
export const pollUntil = async (
  check: () => Promise<boolean>,
  timeoutError?: string,
): Promise<boolean> => {
  for (let attempt = 0; attempt < POLL_TRIES; attempt++) {
    try {
      if (await check()) return true;
    } catch (error) {
      if (!isRetriableError(error)) throw error;
    }
    if (attempt < POLL_TRIES - 1) await sleep(POLL_DELAY_MS);
  }
  if (timeoutError) throw new Error(timeoutError);
  return false;
};

/**
 * Polls `fetch` on the same cadence until it yields a value, treating errors
 * matched by `isTransient` as "keep waiting" and rethrowing anything else.
 */
export const pollForValue = async <T>(
  fetch: () => Promise<T>,
  isTransient: (error: unknown) => boolean,
  timeoutError: string,
): Promise<T> => {
  for (let attempt = 0; attempt < POLL_TRIES; attempt++) {
    try {
      return await fetch();
    } catch (error) {
      if (!isTransient(error)) throw error;
      if (attempt < POLL_TRIES - 1) await sleep(POLL_DELAY_MS);
    }
  }
  throw new Error(timeoutError);
};
