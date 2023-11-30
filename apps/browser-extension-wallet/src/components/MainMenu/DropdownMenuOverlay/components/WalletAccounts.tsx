import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NavigationButton } from '@lace/common';
import styles from './WalletAccounts.module.scss';
import { ProfileDropdown } from '@lace/ui';
import { useEditAccountDrawer } from '@src/features/account/components/EditAccount/hooks';
import { EditAccountDrawer } from '@src/features/account/components/EditAccount/EditAccountDrawer';
import { AccountData } from '@lace/ui/dist/design-system/profile-dropdown/accounts/profile-dropdown-accounts-list.component';

const exampleAccountData = [
  {
    accountNumber: 1,
    label: 'Account #1',
    isUnlocked: true
  },
  {
    accountNumber: 2,
    label: 'Account #2',
    isUnlocked: true
  },
  {
    accountNumber: 3,
    label: 'Account #3',
    isUnlocked: true
  },
  {
    accountNumber: 4,
    label: 'Account #4',
    isUnlocked: true
  },
  {
    accountNumber: 5,
    label: 'Account #5',
    isUnlocked: true
  },
  {
    accountNumber: 6,
    label: 'Account #6',
    isUnlocked: false
  },
  {
    accountNumber: 7,
    label: 'Account #7',
    isUnlocked: false
  },
  {
    accountNumber: 8,
    label: 'Account #8',
    isUnlocked: false
  },
  {
    accountNumber: 9,
    label: 'Account #9',
    isUnlocked: false
  },
  {
    accountNumber: 10,
    label: 'Account #10',
    isUnlocked: false
  }
];

export const WalletAccounts = ({ isPopup, onBack }: { isPopup: boolean; onBack: () => void }): React.ReactElement => {
  const { t } = useTranslation();
  const editAccountDrawer = useEditAccountDrawer();
  const [mockAccountData, updateMockAccountData] = useState<AccountData[]>(exampleAccountData);

  return (
    <>
      <div data-testid="user-dropdown-wallet-accounts-section" className={styles.container}>
        <div className={styles.navigation} data-testid="drawer-navigation">
          <NavigationButton iconClassName={styles.iconClassName} icon="arrow" onClick={onBack} />
        </div>
        <div className={styles.titleSection}>
          <div data-testid="user-dropdown-wallet-accounts-title" className={styles.title}>
            {t('browserView.settings.wallet.accounts.title')}
          </div>
          <div data-testid="user-dropdown-wallet-accounts-description" className={styles.subTitle}>
            {t('browserView.settings.wallet.accounts.description')}
          </div>
        </div>
        <div
          className={isPopup ? styles.popUpContent : styles.extendedContent}
          data-testid="user-dropdown-wallet-account-list"
        >
          <ProfileDropdown.AccountsList
            unlockLabel={t('browserView.settings.wallet.accounts.unlockLabel')}
            onAccountEditClick={(accountNumber) =>
              editAccountDrawer.open(mockAccountData.find((a) => a.accountNumber === accountNumber))
            }
            accounts={mockAccountData}
          />
        </div>
      </div>
      <EditAccountDrawer
        onSave={(newAccountName) => {
          const modifiedAccount = mockAccountData.find(
            (a) => a.accountNumber === editAccountDrawer.accountData?.accountNumber
          );
          modifiedAccount.label = newAccountName;
          updateMockAccountData(mockAccountData);
          editAccountDrawer.hide();
        }}
        visible={editAccountDrawer.isOpen}
        hide={editAccountDrawer.hide}
        name={editAccountDrawer.accountData?.label}
        index={editAccountDrawer.accountData?.accountNumber}
        isPopup={isPopup}
      />
    </>
  );
};
