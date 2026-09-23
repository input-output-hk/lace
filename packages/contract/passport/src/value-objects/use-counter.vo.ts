import type { Tagged } from 'type-fest';

/**
 * Monotonically increasing anti-replay counter that the Account Custody
 * Contract tracks per authoriser. Incremented on every accepted
 * authorisation so a captured signature cannot be replayed.
 */
export type UseCounter = Tagged<bigint, 'UseCounter'>;
export const UseCounter = (value: bigint): UseCounter => value as UseCounter;
