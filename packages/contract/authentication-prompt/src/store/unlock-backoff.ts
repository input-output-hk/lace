/** Base delay before the first post-failure unlock retry (ms). */
const UNLOCK_BACKOFF_BASE_MS = 1000;
/** Upper bound on the exponential unlock backoff (ms). */
const UNLOCK_BACKOFF_MAX_MS = 60_000;

/**
 * Exponential backoff applied to wallet unlock after consecutive password
 * failures (NWL R1 audit L-201 — rate-limits online/at-the-keyboard guessing).
 * Zero for the first attempt (`failedAttempts === 0`), then 1s, 2s, 4s, …
 * capped at 60s.
 *
 * The value is enforced at the prompt UI (submit is disabled with a countdown
 * until it elapses) rather than by delaying the verification side-effect —
 * delaying the verify defers the auth-secret read past the point where the UI
 * zeroes the secret, which would break every unlock. Keeping the throttle in
 * front of submission also keeps the plaintext secret's memory lifetime short.
 */
export const computeUnlockBackoffMs = (failedAttempts: number): number =>
  failedAttempts <= 0
    ? 0
    : Math.min(
        UNLOCK_BACKOFF_BASE_MS * 2 ** (failedAttempts - 1),
        UNLOCK_BACKOFF_MAX_MS,
      );
