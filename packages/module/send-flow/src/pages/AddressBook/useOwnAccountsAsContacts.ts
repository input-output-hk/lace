import { useTranslation } from '@lace-contract/i18n';
import { useMemo } from 'react';

import { useLaceSelector } from '../../hooks';

import type { AccountId } from '@lace-contract/wallet-repo';
import type { ContactItem } from '@lace-lib/ui-toolkit';

export const useOwnAccountsAsContacts = (
  sourceAccountId: AccountId,
  blockchainName: string | undefined,
): ContactItem[] => {
  const { t } = useTranslation();
  const selfIndicator: string = t('v2.sheets.address-book.self-indicator');
  const allAddressesResult = useLaceSelector(
    'addresses.selectActiveNetworkAccountAddresses',
  );
  const allAddresses = Array.isArray(allAddressesResult)
    ? allAddressesResult
    : [];
  const accountsResult = useLaceSelector('wallets.selectActiveNetworkAccounts');
  const accounts = Array.isArray(accountsResult) ? accountsResult : [];
  const walletsResult = useLaceSelector('wallets.selectAll');
  const wallets = Array.isArray(walletsResult) ? walletsResult : [];

  return useMemo(() => {
    if (!blockchainName) return [];

    const filteredAccounts = accounts.filter(
      account => account.blockchainName === blockchainName,
    );
    const hasMultipleWallets = wallets.length > 1;

    return filteredAccounts
      .map(account => {
        const wallet = wallets.find(w => w.walletId === account.walletId);
        const accountName = account.metadata.name;
        const displayName =
          hasMultipleWallets && wallet
            ? `${wallet.metadata.name} · ${accountName}`
            : accountName;

        const name =
          account.accountId === sourceAccountId
            ? `${displayName} ${selfIndicator}`
            : displayName;

        const addresses = allAddresses.filter(
          addr => addr.accountId === account.accountId,
        );

        return {
          id: account.accountId,
          name,
          avatar: account.metadata.avatarUri,
          addresses: addresses.map(addr => ({
            address: addr.address,
            blockchainName: addr.blockchainName,
            accountId: addr.accountId,
            name: addr.name,
          })),
        };
      })
      .filter(item => item.addresses.length > 0);
  }, [
    allAddressesResult,
    accountsResult,
    walletsResult,
    blockchainName,
    sourceAccountId,
    selfIndicator,
  ]);
};
