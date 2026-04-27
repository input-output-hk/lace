import { useMemo } from 'react';

import { useLaceSelector } from './storeHooks';

import type { SignDataAccountInfo } from '../types/sign-data-account';

/**
 * Active account row for Sign Data UI (mobile sheet + browser popup).
 */
export const useSignDataAccountInfo = (): SignDataAccountInfo | undefined => {
  const activeAccountContext = useLaceSelector(
    'wallets.selectActiveAccountContext',
  );
  const allAccounts = useLaceSelector('wallets.selectActiveNetworkAccounts');

  return useMemo((): SignDataAccountInfo | undefined => {
    if (!activeAccountContext) return undefined;
    const activeAccount = allAccounts.find(
      account =>
        account.accountId === activeAccountContext.accountId &&
        account.walletId === activeAccountContext.walletId,
    );
    if (!activeAccount) return undefined;
    return {
      name: activeAccount.metadata.name,
      avatarUri: activeAccount.metadata.avatarUri,
    };
  }, [activeAccountContext, allAccounts]);
};
