/* eslint-disable react/jsx-handler-names */
import React, { useCallback, useMemo } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { NavigationButton, toast } from '@lace/common';
import styles from './WalletAccounts.module.scss';
import { ProfileDropdown } from '@lace/ui';
import { AccountData } from '@lace/ui/dist/design-system/profile-dropdown/accounts/profile-dropdown-accounts-list.component';
import { DisableAccountConfirmation, EditAccountDrawer, useAccountDataModal } from '@lace/core';
import { useWalletStore } from '@src/stores';
import { useWalletManager } from '@hooks';
import { TOAST_DEFAULT_DURATION } from '@hooks/useActionExecution';
import { WalletType } from '@cardano-sdk/web-extension';
import { Link } from 'react-router-dom';
import { useBackgroundServiceAPIContext } from '@providers/BackgroundServiceAPI';
import { BrowserViewSections } from '@lib/scripts/types';

const defaultAccountName = (accountNumber: number) => `Account #${accountNumber}`;

const NUMBER_OF_ACCOUNTS_PER_WALLET = 24;

export const WalletAccounts = ({ isPopup, onBack }: { isPopup: boolean; onBack: () => void }): React.ReactElement => {
  const { t } = useTranslation();
  const accountsListLabel = useMemo(
    () => ({
      unlock: t('browserView.settings.wallet.accounts.unlockLabel'),
      lock: t('browserView.settings.wallet.accounts.lockLabel')
    }),
    [t]
  );
  const editAccountDrawer = useAccountDataModal();
  const backgroundServices = useBackgroundServiceAPIContext();
  const disableAccountConfirmation = useAccountDataModal();
  const { manageAccountsWallet: wallet, cardanoWallet, setIsDropdownMenuOpen } = useWalletStore();
  const {
    source: {
      wallet: { walletId: activeWalletId },
      account: activeAccount
    }
  } = cardanoWallet;
  const { walletRepository, addAccount, activateWallet } = useWalletManager();
  const disableUnlock = useMemo(
    () =>
      isPopup &&
      (wallet.type === WalletType.Ledger || wallet.type === WalletType.Trezor) && {
        reason: (
          <Trans
            i18nKey="multiWallet.popupHwAccountEnable"
            components={[
              <Link
                key="expandLink"
                to={BrowserViewSections.HOME}
                onClick={() => backgroundServices.handleOpenBrowser({ section: BrowserViewSections.HOME })}
              />
            ]}
          />
        )
      },
    [backgroundServices, isPopup, wallet.type]
  );
  const accountsData = useMemo(
    () =>
      Array.from({ length: NUMBER_OF_ACCOUNTS_PER_WALLET }).map((_, accountNumber): AccountData => {
        const account = wallet.accounts.find(({ accountIndex }) => accountIndex === accountNumber);
        return {
          isUnlocked: !!account,
          label: account ? account.metadata.name : defaultAccountName(accountNumber),
          accountNumber,
          isActive: activeWalletId === wallet.walletId && activeAccount?.accountIndex === accountNumber,
          disableUnlock
        };
      }),
    [wallet, activeAccount?.accountIndex, activeWalletId, disableUnlock]
  );

  const activateAccount = useCallback(
    async (accountIndex: number) => {
      await activateWallet({
        walletId: wallet.walletId,
        accountIndex
      });
      setIsDropdownMenuOpen(false);
      const accountName = accountsData.find((acc) => acc.accountNumber === accountIndex)?.label;
      toast.notify({
        duration: TOAST_DEFAULT_DURATION,
        text: t('multiWallet.activated.account', { accountName })
      });
    },
    [wallet.walletId, activateWallet, accountsData, setIsDropdownMenuOpen, t]
  );

  const editAccount = useCallback(
    (accountIndex: number) => editAccountDrawer.open(accountsData.find((a) => a.accountNumber === accountIndex)),
    [editAccountDrawer, accountsData]
  );

  const deleteAccount = useCallback(
    async (accountIndex: number) => {
      disableAccountConfirmation.open(accountsData.find((a) => a.accountNumber === accountIndex));
    },
    [disableAccountConfirmation, accountsData]
  );

  const unlockAccount = useCallback(
    async (accountIndex: number) => {
      const name = defaultAccountName(accountIndex);
      await addAccount({
        wallet,
        accountIndex,
        metadata: { name }
      });
      setIsDropdownMenuOpen(false);
      toast.notify({
        duration: TOAST_DEFAULT_DURATION,
        text: t('multiWallet.activated.account', { accountName: name })
      });
    },
    [wallet, addAccount, t, setIsDropdownMenuOpen]
  );

  const lockAccount = useCallback(async () => {
    await walletRepository.removeAccount({
      walletId: wallet.walletId,
      accountIndex: disableAccountConfirmation.accountData.accountNumber
    });

    disableAccountConfirmation.hide();
  }, [walletRepository, disableAccountConfirmation, wallet.walletId]);

  const renameAccount = useCallback(
    async (newAccountName: string) => {
      await walletRepository.updateAccountMetadata({
        walletId: wallet.walletId,
        accountIndex: editAccountDrawer.accountData.accountNumber,
        metadata: { name: newAccountName }
      });
      editAccountDrawer.hide();
    },
    [walletRepository, wallet.walletId, editAccountDrawer]
  );

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
            label={accountsListLabel}
            onAccountActivateClick={activateAccount}
            onAccountEditClick={editAccount}
            onAccountDeleteClick={deleteAccount}
            onAccountUnlockClick={unlockAccount}
            accounts={accountsData}
          />
        </div>
      </div>
      <EditAccountDrawer
        onSave={renameAccount}
        visible={editAccountDrawer.isOpen}
        hide={editAccountDrawer.hide}
        name={editAccountDrawer.accountData?.label}
        index={editAccountDrawer.accountData?.accountNumber}
        isPopup={isPopup}
        translations={{
          title: t('account.edit.title'),
          inputLabel: t('account.edit.input.label'),
          save: t('account.edit.footer.save'),
          cancel: t('account.edit.footer.cancel')
        }}
      />
      <DisableAccountConfirmation
        zIndex={10_000}
        open={disableAccountConfirmation.isOpen}
        onCancel={disableAccountConfirmation.hide}
        onConfirm={lockAccount}
        translations={{
          title: t('account.disable.title'),
          description: t('account.disable.description'),
          cancel: t('account.disable.cancel'),
          confirm: t('account.disable.confirm')
        }}
      />
    </>
  );
};
