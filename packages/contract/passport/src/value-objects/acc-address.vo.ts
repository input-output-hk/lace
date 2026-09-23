import type { Tagged } from 'type-fest';

/**
 * On-chain address of an Account Custody Contract (ACC), the Midnight
 * smart contract that is the durable identity behind a Passport account.
 */
export type AccAddress = Tagged<string, 'AccAddress'>;
export const AccAddress = (value: string): AccAddress => value as AccAddress;
