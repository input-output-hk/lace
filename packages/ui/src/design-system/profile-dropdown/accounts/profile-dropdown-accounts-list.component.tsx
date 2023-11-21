import React from 'react';

import { Flex } from '../..';

import { AccountItem } from './profile-dropdown-account-item.component';

export interface AccountData {
  label: string;
  accountNumber: number;
  isUnlocked: boolean;
}

export interface Props {
  accounts: AccountData[];
  unlockLabel: string;
  onAccountUnlockClick?: (accountNumber: number) => void;
  onAccountEditClick?: (accountNumber: number) => void;
  onAccountDeleteClick?: (accountNumber: number) => void;
}

export const AccountsList = ({
  accounts,
  unlockLabel,
  onAccountUnlockClick,
  onAccountEditClick,
  onAccountDeleteClick,
}: Readonly<Props>): JSX.Element => (
  <Flex gap="$32" flexDirection="column">
    {accounts.map(a => (
      <AccountItem
        key={a.accountNumber}
        accountNumber={a.accountNumber}
        isUnlocked={a.isUnlocked}
        label={a.label}
        unlockLabel={unlockLabel}
        onUnlockClick={onAccountUnlockClick}
        onEditClick={onAccountEditClick}
        onDeleteClick={onAccountDeleteClick}
      />
    ))}
  </Flex>
);
