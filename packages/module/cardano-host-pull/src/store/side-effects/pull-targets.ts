import { isCardanoBip32Account } from '@lace-contract/cardano-context';

import type { AccountId, AnyAccount } from '@lace-contract/wallet-repo';

/** The (walletId, accountIndex, networkMagic) triple the account-scoped host
 * methods are keyed on, paired with the accountId the guest files the answer
 * under. */
export type PullTarget = {
  accountId: AccountId;
  walletId: string;
  accountIndex: number;
  networkMagic: number;
};

/** The active-network Cardano accounts a pull covers. Script accounts
 * (MultiSig, custody) are excluded: their `blockchainSpecific` carries no
 * accountIndex, so no host account is addressable for them. */
export const pullTargets = (accounts: readonly AnyAccount[]): PullTarget[] =>
  accounts.flatMap(account => {
    if (!isCardanoBip32Account(account)) {
      return [];
    }
    const { accountIndex, chainId } = account.blockchainSpecific;
    return [
      {
        accountId: account.accountId,
        walletId: account.walletId,
        accountIndex,
        networkMagic: Number(chainId.networkMagic),
      },
    ];
  });

/** Whether two target lists name the same accounts — the account list re-emits
 * a fresh array on every sync round, which must not re-arm a pull. */
export const sameTargets = (
  left: readonly PullTarget[],
  right: readonly PullTarget[],
): boolean =>
  left.length === right.length &&
  left.every((target, index) => target.accountId === right[index]?.accountId);
