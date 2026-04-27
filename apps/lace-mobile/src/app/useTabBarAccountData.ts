import { computeAccountSyncingProgress } from '@lace-contract/sync';
import { useMemo } from 'react';

import { useLaceSelector } from './util/hooks';

import type { AccountRowProps } from '@lace-lib/ui-toolkit';

export const useTabBarAccountData = (): AccountRowProps[] => {
  const accountsResult = useLaceSelector('wallets.selectActiveNetworkAccounts');
  const walletsResult = useLaceSelector('wallets.selectAll');
  const syncStatusByAccount = useLaceSelector('sync.selectSyncStatusByAccount');

  const accounts = useMemo(
    () => (Array.isArray(accountsResult) ? accountsResult : []),
    [accountsResult],
  );

  const wallets = useMemo(
    () => (Array.isArray(walletsResult) ? walletsResult : []),
    [walletsResult],
  );

  return useMemo<AccountRowProps[]>(() => {
    return accounts.map(account => {
      const wallet = wallets.find(item => item?.walletId === account?.walletId);

      // Calculate sync status from syncStatusByAccount
      const accountStatus = syncStatusByAccount[account.accountId];
      let syncStatus: 'error' | 'synced' | 'syncing' = 'syncing';
      let syncingProgress: number | undefined;

      if (accountStatus?.pendingSync) {
        const operations = Object.values(accountStatus.pendingSync.operations);
        const hasFailed = operations.some(op => op.status === 'Failed');
        syncStatus = hasFailed ? 'error' : 'syncing';
        syncingProgress = computeAccountSyncingProgress(accountStatus);
      } else if (accountStatus?.lastSuccessfulSync) {
        syncStatus = 'synced';
      }

      return {
        accountName: account?.metadata?.name ?? '',
        walletName: wallet?.metadata?.name ?? '',
        status: syncStatus,
        syncingProgress,
        leftIcon: (account?.blockchainName ||
          'Cardano') as AccountRowProps['leftIcon'],
      };
    });
  }, [accounts, wallets, syncStatusByAccount]);
};
