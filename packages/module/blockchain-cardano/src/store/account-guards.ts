// The guards an ordinary builder runs on the account it spends from, for the
// account kinds the features add: it refuses a custody account, whose UTxOs
// only the custody builder spends. The stable SDK build resolves
// account-guards.stable.ts instead.
// Keep the two files' exports in step, apart from the names the variant
// declares on stable-omits lines; the SDK's stable variant parity check
// enforces it.
import { refuseCustodyAccount } from './custody/custody-account-guard';

import type { AnyAddress } from '@lace-contract/addresses';
import type { AccountId } from '@lace-contract/wallet-repo';

/** Throws when an ordinary builder may not spend from the account. */
export const refuseExtensionAccount = (
  accountId: AccountId,
  addresses: readonly AnyAddress[],
): void => {
  refuseCustodyAccount(accountId, addresses);
};
