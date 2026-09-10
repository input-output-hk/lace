import { useMemo } from 'react';

import { useLaceSelector } from './storeHooks';

import type { AccountId } from '@lace-contract/wallet-repo';

/**
 * Account info shown on the sign message review screen.
 */
export interface SignMessageAccountInfo {
  name: string;
  avatarUri?: string;
  accountId: AccountId;
}

/**
 * Resolves the account that owns the signing address, so the review screen
 * can show which account is signing alongside the address itself.
 *
 * Returns undefined when the address is not owned by any account on the
 * active network (the review screen simply omits the account row then).
 */
export const useSignMessageAccountInfo = (
  address: string,
): SignMessageAccountInfo | undefined => {
  const allAddresses = useLaceSelector('addresses.selectAllAddresses');
  const allAccounts = useLaceSelector('wallets.selectActiveNetworkAccounts');

  return useMemo((): SignMessageAccountInfo | undefined => {
    const owningAddress = allAddresses.find(
      candidate =>
        candidate.blockchainName === 'Bitcoin' && candidate.address === address,
    );
    if (!owningAddress) return undefined;
    const account = allAccounts.find(
      candidate => candidate.accountId === owningAddress.accountId,
    );
    if (!account) return undefined;
    return {
      name: account.metadata.name,
      avatarUri: account.metadata.avatarUri,
      accountId: account.accountId,
    };
  }, [address, allAddresses, allAccounts]);
};
