import type { Tagged } from 'type-fest';

/**
 * On-chain address of an Account Custody Contract (ACC), the Midnight
 * smart contract that is the durable identity behind a Passport account.
 */
export type AccAddress = Tagged<string, 'AccAddress'>;
/** Types a string as an Account Custody Contract address. It checks nothing. */
export const AccAddress = (value: string): AccAddress => value as AccAddress;
