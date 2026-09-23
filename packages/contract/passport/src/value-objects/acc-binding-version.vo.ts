import type { Tagged } from 'type-fest';

/**
 * Version of the Account Custody Contract binding a Passport account was
 * deployed from. Lets the wallet detect when a locally bundled contract
 * layout is stale relative to the account it is talking to on chain.
 */
export type AccBindingVersion = Tagged<string, 'AccBindingVersion'>;
export const AccBindingVersion = (value: string): AccBindingVersion =>
  value as AccBindingVersion;
