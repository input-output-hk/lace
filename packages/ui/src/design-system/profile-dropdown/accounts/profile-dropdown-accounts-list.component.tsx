import React from 'react';

import { Flex } from '../../flex';

import { AccountItem } from './profile-dropdown-account-item.component';

export interface AccountData {
  label: string;
  accountNumber: number;
  isUnlocked: boolean;
  isActive: boolean;
  disableUnlock?: { reason: React.ReactNode | string };
}

export interface Props {
  accounts: AccountData[];
  label: {
    lock: string;
    unlock: string;
  };
  onAccountActivateClick?: (accountNumber: number) => void;
  onAccountUnlockClick?: (accountNumber: number) => void;
  onAccountEditClick?: (accountNumber: number) => void;
  onAccountDeleteClick?: (accountNumber: number) => void;
}

export const AccountsList = ({
  accounts,
  label,
  onAccountActivateClick,
  onAccountUnlockClick,
  onAccountEditClick,
  onAccountDeleteClick,
}: Readonly<Props>): JSX.Element => {
  const hasMultipleUnlockedAccounts =
    accounts.filter(a => a.isUnlocked).length > 1;
  return (
    <Flex gap="$16" flexDirection="column" data-testid="wallet-accounts-list">
      {accounts.map(a => (
        <AccountItem
          key={a.accountNumber}
          accountNumber={a.accountNumber}
          isUnlocked={a.isUnlocked}
          label={{
            name: a.label,
            ...label,
          }}
          disableUnlock={a.disableUnlock}
          isDeletable={!a.isActive && hasMultipleUnlockedAccounts}
          onActivateClick={(accountNumber: number): void => {
            if (!a.isActive && a.isUnlocked) {
              onAccountActivateClick?.(accountNumber);
            }
          }}
          onUnlockClick={onAccountUnlockClick}
          onEditClick={onAccountEditClick}
          onDeleteClick={onAccountDeleteClick}
        />
      ))}
    </Flex>
  );
};
