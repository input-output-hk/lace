// The stable SDK build resolves this file in place of account-guards.ts: its
// accounts all derive their addresses from keys, so an ordinary builder may
// spend from every one of them.
import type { AnyAddress } from '@lace-contract/addresses';
import type { AccountId } from '@lace-contract/wallet-repo';

/** Throws when an ordinary builder may not spend from the account: never. */
export const refuseExtensionAccount = (
  _accountId: AccountId,
  _addresses: readonly AnyAddress[],
): void => undefined;
