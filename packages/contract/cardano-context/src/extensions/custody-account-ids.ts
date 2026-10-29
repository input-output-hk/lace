import { walletsSelectors } from '@lace-contract/wallet-repo';
import { createSelector } from '@reduxjs/toolkit';

import { isCardanoCustodyAccount } from '../custody/account';

import type { CardanoCustodyAccount } from '../custody/account';
import type { AnyAccount } from '@lace-contract/wallet-repo';

const haveSameAccounts = (
  a: readonly CardanoCustodyAccount[],
  b: readonly CardanoCustodyAccount[],
): boolean =>
  a.length === b.length && a.every((account, index) => account === b[index]);

/**
 * Every Cardano custody account in the repository, on every network. Keeps
 * its reference until a custody account changes, so the selectors built on
 * it do not recompute on unrelated wallet updates.
 */
export const selectCardanoCustodyAccounts = createSelector(
  walletsSelectors.wallets.selectAll,
  (wallets): CardanoCustodyAccount[] =>
    wallets.flatMap(wallet =>
      (wallet.accounts as AnyAccount[]).filter(isCardanoCustodyAccount),
    ),
  { memoizeOptions: { resultEqualityCheck: haveSameAccounts } },
);

/**
 * The ids of the Cardano custody accounts, whose UTxOs only the custody
 * builders may spend.
 */
export const selectCustodyAccountIds = createSelector(
  selectCardanoCustodyAccounts,
  (accounts): ReadonlySet<string> =>
    new Set(accounts.map(({ accountId }) => accountId)),
);
