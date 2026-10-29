import type { Tagged } from 'type-fest';

/** Identifies one account in wallet state, unique across its wallets. */
export type AccountId = Tagged<string, 'AccountId'>;
/**
 * Types a string as an account identifier, such as the `accountId` of an
 * account in wallet state. It checks nothing.
 */
export const AccountId = (value: string) => value as AccountId;
