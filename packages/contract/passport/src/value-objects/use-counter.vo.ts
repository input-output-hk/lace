import type { Tagged } from 'type-fest';

/**
 * Monotonically increasing anti-replay counter that the Account Custody
 * Contract tracks per authoriser. Incremented on every accepted
 * authorisation so a captured signature cannot be replayed.
 */
export type UseCounter = Tagged<bigint, 'UseCounter'>;
/** Types a bigint as an authoriser's use counter. It checks nothing. */
export const UseCounter = (value: bigint): UseCounter => value as UseCounter;
