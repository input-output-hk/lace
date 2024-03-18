/* eslint-disable react/jsx-handler-names */
import React, { useCallback, useMemo } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { NavigationButton, toast } from '@lace/common';
import styles from './WalletAccounts.module.scss';
import { ProfileDropdown } from '@lace/ui';
import { AccountData } from '@lace/ui/dist/design-system/profile-dropdown/accounts/profile-dropdown-accounts-list.component';
import {
  DisableAccountConfirmation,
  EditAccountDrawer,
  EnableAccountConfirmWithHW,
  EnableAccountConfirmWithHWState,
  EnableAccountPasswordPrompt,
  useDialogWithData
} from '@lace/core';
import { useWalletStore } from '@src/stores';
import { useWalletManager } from '@hooks';
import { TOAST_DEFAULT_DURATION } from '@hooks/useActionExecution';
import { WalletType } from '@cardano-sdk/web-extension';
import { Link } from 'react-router-dom';
import { useBackgroundServiceAPIContext } from '@providers/BackgroundServiceAPI';
import { BrowserViewSections } from '@lib/scripts/types';

const defaultAccountName = (accountNumber: number) => `Account #${accountNumber}`;

const NUMBER_OF_ACCOUNTS_PER_WALLET = 24;
const HW_CONNECT_TIMEOUT_MS = 30_000;

type EnableAccountPasswordDialogData = {
  accountIndex: number;
  wasPasswordIncorrect?: boolean;
};

type EnableAccountHWSigningDialogData = {
  accountIndex: number;
  state: EnableAccountConfirmWithHWState;
};

export const WalletAccounts = ({ isPopup, onBack }: { isPopup: boolean; onBack: () => void }): React.ReactElement => {
  const { t } = useTranslation();
  const accountsListLabel = useMemo(
    () => ({
      unlock: t('browserView.settings.wallet.accounts.unlockLabel'),
      lock: t('browserView.settings.wallet.accounts.lockLabel')
    }),
    [t]
  );
  const backgroundServices = useBackgroundServiceAPIContext();
  const { manageAccountsWallet: wallet, cardanoWallet, setIsDropdownMenuOpen } = useWalletStore();
  const { walletRepository, addAccount, activateWallet } = useWalletManager();
  const {
    source: {
      wallet: { walletId: activeWalletId },
      account: activeAccount
    }
  } = cardanoWallet;

  const editAccountDrawer = useDialogWithData<ProfileDropdown.AccountData | undefined>();
  const disableAccountConfirmation = useDialogWithData<ProfileDropdown.AccountData | undefined>();
  const enableAccountPasswordDialog = useDialogWithData<EnableAccountPasswordDialogData | undefined>();
  const enableAccountHWSigningDialog = useDialogWithData<EnableAccountHWSigningDialogData | undefined>();

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

  const closeDropdownAndShowAccountActivated = useCallback(
    (accountName: string) => {
      setIsDropdownMenuOpen(false);
      toast.notify({
        duration: TOAST_DEFAULT_DURATION,
        text: t('multiWallet.activated.account', { accountName })
      });
    },
    [setIsDropdownMenuOpen, t]
  );

  const activateAccount = useCallback(
    async (accountIndex: number) => {
      await activateWallet({
        walletId: wallet.walletId,
        accountIndex
      });
      const accountName = accountsData.find((acc) => acc.accountNumber === accountIndex)?.label;
      closeDropdownAndShowAccountActivated(accountName);
    },
    [wallet.walletId, activateWallet, accountsData, closeDropdownAndShowAccountActivated]
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

  const showHWErrorState = useCallback(() => {
    enableAccountHWSigningDialog.setData({
      ...enableAccountHWSigningDialog.data,
      state: 'error'
    });
  }, [enableAccountHWSigningDialog]);

  const unlockHWAccount = useCallback(
    async (accountIndex: number) => {
      const name = defaultAccountName(accountIndex);
      try {
        const timeout = setTimeout(showHWErrorState, HW_CONNECT_TIMEOUT_MS);
        await addAccount({
          wallet,
          accountIndex,
          metadata: { name }
        });
        clearTimeout(timeout);
        enableAccountHWSigningDialog.hide();
        closeDropdownAndShowAccountActivated(name);
      } catch {
        showHWErrorState();
      }
    },
    [addAccount, wallet, enableAccountHWSigningDialog, closeDropdownAndShowAccountActivated, showHWErrorState]
  );

  const unlockAccount = useCallback(
    async (accountIndex: number) => {
      switch (wallet.type) {
        case WalletType.InMemory:
          enableAccountPasswordDialog.setData({ accountIndex });
          enableAccountPasswordDialog.open();
          break;
        case WalletType.Ledger:
        case WalletType.Trezor:
          enableAccountHWSigningDialog.setData({
            accountIndex,
            state: 'signing'
          });
          enableAccountHWSigningDialog.open();
          await unlockHWAccount(accountIndex);
      }
    },
    [wallet.type, enableAccountPasswordDialog, enableAccountHWSigningDialog, unlockHWAccount]
  );

  const unlockInMemoryWalletAccountWithPassword = useCallback(
    async (passphrase: Uint8Array) => {
      const { accountIndex } = enableAccountPasswordDialog.data;
      const name = defaultAccountName(accountIndex);
      try {
        await addAccount({
          wallet,
          accountIndex,
          passphrase,
          metadata: { name: defaultAccountName(accountIndex) }
        });
        enableAccountPasswordDialog.hide();
        closeDropdownAndShowAccountActivated(name);
      } catch {
        enableAccountPasswordDialog.setData({ ...enableAccountPasswordDialog.data, wasPasswordIncorrect: true });
      }
    },
    [wallet, addAccount, enableAccountPasswordDialog, closeDropdownAndShowAccountActivated]
  );

  const lockAccount = useCallback(async () => {
    await walletRepository.removeAccount({
      walletId: wallet.walletId,
      accountIndex: disableAccountConfirmation.data.accountNumber
    });

    disableAccountConfirmation.hide();
  }, [walletRepository, disableAccountConfirmation, wallet.walletId]);

  const renameAccount = useCallback(
    async (newAccountName: string) => {
      await walletRepository.updateAccountMetadata({
        walletId: wallet.walletId,
        accountIndex: editAccountDrawer.data.accountNumber,
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
      {/* Conditionally render the password prompt to make sure
      the password is not stored in the component state */}
      {enableAccountPasswordDialog.isOpen && (
        <EnableAccountPasswordPrompt
          open
          isPopup={isPopup}
          wasPasswordIncorrect={enableAccountPasswordDialog.data?.wasPasswordIncorrect}
          onCancel={enableAccountPasswordDialog.hide}
          onConfirm={unlockInMemoryWalletAccountWithPassword}
          translations={{
            title: t('account.enable.title'),
            headline: t('account.enable.inMemory.headline'),
            description: t('account.enable.inMemory.description'),
            passwordPlaceholder: t('account.enable.inMemory.passwordPlaceholder'),
            wrongPassword: t('account.enable.inMemory.wrongPassword'),
            cancel: t('account.enable.inMemory.cancel'),
            confirm: t('account.enable.inMemory.confirm')
          }}
        />
      )}
      {enableAccountHWSigningDialog.isOpen && (
        <EnableAccountConfirmWithHW
          open
          isPopup={isPopup}
          onCancel={enableAccountHWSigningDialog.hide}
          onRetry={() => {
            enableAccountHWSigningDialog.setData({
              ...enableAccountHWSigningDialog.data,
              state: 'signing'
            });
            unlockHWAccount(enableAccountHWSigningDialog.data?.accountIndex);
          }}
          state={enableAccountHWSigningDialog.data?.state}
          translations={{
            title: t('account.enable.title'),
            headline: t('account.enable.hw.headline'),
            errorHeadline: t('account.enable.hw.errorHeadline'),
            description: t('account.enable.hw.description'),
            errorDescription: t('account.enable.hw.errorDescription'),
            errorHelpLink: t('account.enable.hw.errorHelpLink'),
            buttons: {
              cancel: t('account.enable.hw.buttons.cancel'),
              waiting: t('account.enable.hw.buttons.waiting', { device: wallet.type }),
              signing: t('account.enable.hw.buttons.signing'),
              error: t('account.enable.hw.buttons.tryAgain')
            }
          }}
        />
      )}
      <EditAccountDrawer
        onSave={renameAccount}
        visible={editAccountDrawer.isOpen}
        hide={editAccountDrawer.hide}
        name={editAccountDrawer.data?.label}
        index={editAccountDrawer.data?.accountNumber}
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
