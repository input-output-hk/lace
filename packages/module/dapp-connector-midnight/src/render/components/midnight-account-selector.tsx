import { useTranslation } from '@lace-contract/i18n';
import { DropdownMenu } from '@lace-lib/ui-toolkit';
import React, { useCallback, useMemo } from 'react';

import type { AnyAccount } from '@lace-contract/wallet-repo';

export interface MidnightAccountSelectorProps {
  accounts: AnyAccount[];
  walletNameByWalletId: Record<string, string>;
  selectedAccount: AnyAccount | null;
  onSelectAccount: (account: AnyAccount) => void;
}

export const MidnightAccountSelector = ({
  accounts,
  walletNameByWalletId,
  selectedAccount,
  onSelectAccount,
}: MidnightAccountSelectorProps) => {
  const { t } = useTranslation();

  const items = useMemo(
    () =>
      accounts.map(account => ({
        id: account.accountId,
        text: account.metadata.name,
        subText: walletNameByWalletId[account.walletId],
        avatar: account.metadata.avatarUri
          ? {
              img: { uri: account.metadata.avatarUri },
              fallback: account.metadata.name.substring(0, 2).toUpperCase(),
            }
          : { fallback: account.metadata.name.substring(0, 2).toUpperCase() },
      })),
    [accounts, walletNameByWalletId],
  );

  const handleSelectAccount = useCallback(
    (index: number) => {
      const account = accounts[index];
      if (account) onSelectAccount(account);
    },
    [accounts, onSelectAccount],
  );

  return (
    <DropdownMenu
      items={items}
      title={
        selectedAccount?.metadata.name ??
        t('dapp-connector.connect-dapp.account-label')
      }
      onSelectItem={handleSelectAccount}
      selectedItemId={selectedAccount?.accountId}
      truncateText
    />
  );
};
