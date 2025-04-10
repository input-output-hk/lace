import React, { ReactElement, useMemo, useState } from 'react';
import * as KeyManagement from '@cardano-sdk/key-management';
import { Drawer, DrawerHeader, DrawerNavigation, logger, PostHogAction, toast } from '@lace/common';
import { Box, Button, Flex, Text, TextBox } from '@input-output-hk/lace-ui-toolkit';
import { useWalletStore } from '@stores';
import { TOAST_DEFAULT_DURATION, useWalletManager } from '@hooks';
import { Bip32WalletAccount } from '@cardano-sdk/web-extension';
import { Wallet } from '@lace/cardano';
import { usePostHogClientContext } from '@providers/PostHogClientProvider';
import { useTranslation } from 'react-i18next';

const getDerivationPath = (accountIndex: number) =>
  `m/${KeyManagement.KeyPurpose.STANDARD}'/${KeyManagement.CardanoKeyConst.COIN_TYPE}'/${accountIndex}'`;

const MAX_CHARACTER_LENGTH = 20;

interface RenameWalletDrawerProps {
  open: boolean;
  popupView: boolean;
  onClose: () => void;
}

const getStandardAccountsInitValues = (accounts: Bip32WalletAccount<Wallet.AccountMetadata>[]) =>
  accounts
    .filter((account) => account.purpose !== KeyManagement.KeyPurpose.MULTI_SIG)
    .map((account) => ({
      value: {
        accountIndex: account.accountIndex,
        metadata: {
          ...account.metadata,
          name: account.metadata.name
        }
      },
      errorMessage: ''
    }));

export const RenameWalletDrawer = ({ popupView, onClose, open }: RenameWalletDrawerProps): ReactElement => {
  const posthog = usePostHogClientContext();
  const { t } = useTranslation();
  const { manageAccountsWallet: wallet } = useWalletStore();
  const { walletRepository } = useWalletManager();
  const [newWalletName, setNewWalletName] = useState({
    value: wallet.metadata.name,
    errorMessage: ''
  });
  const [accountsData, setAccountsData] = useState(getStandardAccountsInitValues(wallet.accounts));

  const isInputValid = (name: string): string => {
    if (!name.trim()) return t('browserView.renameWalletDrawer.inputEmptyError');
    if (name.length > MAX_CHARACTER_LENGTH)
      return `${t('browserView.renameWalletDrawer.inputLengthError', { length: MAX_CHARACTER_LENGTH })}`;
    return '';
  };

  const isSaveButtonDisabled = useMemo(
    () => !!newWalletName.errorMessage || !!accountsData.some((account) => account.errorMessage),
    [accountsData, newWalletName.errorMessage]
  );

  const renameWallet = async () => {
    try {
      if (isSaveButtonDisabled) return;

      const currentWalletId = wallet.walletId;
      await walletRepository.updateWalletMetadata({
        walletId: currentWalletId,
        metadata: { ...wallet.metadata, name: newWalletName.value }
      });

      for (const account of accountsData) {
        await walletRepository.updateAccountMetadata({
          walletId: currentWalletId,
          accountIndex: account.value.accountIndex,
          metadata: { ...account.value.metadata, name: account.value.metadata.name }
        });
      }

      void posthog.sendEvent(PostHogAction.RenameWalletSaveClick);
      toast.notify({
        duration: TOAST_DEFAULT_DURATION,
        text: t('browserView.renameWalletDrawer.renameSuccessful')
      });
    } catch (error) {
      logger.error(error);
      toast.notify({
        duration: TOAST_DEFAULT_DURATION,
        text: t('browserView.renameWalletDrawer.renameFailed')
      });
    } finally {
      onClose();
    }
  };

  const handleOnChangeAccountData = (event: Readonly<React.ChangeEvent<HTMLInputElement>>, index: number) => {
    setAccountsData((prev) => {
      const currentAccountData = [...prev];
      currentAccountData[index].value.metadata.name = event.target.value;
      currentAccountData[index].errorMessage = isInputValid(event.target.value);
      return currentAccountData;
    });
  };

  const handleOnClose = async () => {
    await posthog.sendEvent(PostHogAction.RenameWalletCancelClick);
    onClose();
  };

  return (
    <Drawer
      open={open}
      onClose={handleOnClose}
      title={<DrawerHeader popupView={popupView} title={t('browserView.renameWalletDrawer.title')} />}
      navigation={
        <DrawerNavigation
          title={t('browserView.renameWalletDrawer.walletSettings')}
          onCloseIconClick={!popupView ? handleOnClose : undefined}
          onArrowIconClick={popupView ? handleOnClose : undefined}
        />
      }
      footer={
        <Flex flexDirection="column" gap="$16">
          <Button.CallToAction
            label={t('browserView.renameWalletDrawer.save')}
            w="$fill"
            onClick={renameWallet}
            disabled={isSaveButtonDisabled}
            data-testid={'rename-wallet-save-button'}
          />
          <Button.Secondary
            label={t('browserView.renameWalletDrawer.cancel')}
            w="$fill"
            onClick={handleOnClose}
            data-testid={'rename-wallet-cancel-button'}
          />
        </Flex>
      }
      popupView={popupView}
    >
      <>
        <Box mt="$44">
          <Box mb="$24">
            <Text.Body.Large color="secondary" data-testid={'rename-wallet-label'}>
              {t('browserView.renameWalletDrawer.renameWallet')}
            </Text.Body.Large>
          </Box>
          <TextBox
            label={t('browserView.renameWalletDrawer.walletName')}
            value={newWalletName.value}
            onChange={(e) => {
              const errorMessage = isInputValid(e.target.value);
              setNewWalletName({
                value: e.target.value,
                errorMessage
              });
            }}
            w="$fill"
            errorMessage={newWalletName.errorMessage}
            data-testid={'rename-wallet-name'}
          />
        </Box>
        <Box mt="$60" mb="$16">
          <Box mb="$24">
            <Text.Body.Large color="secondary" data-testid={'rename-enabled-accounts-label'}>
              {t('browserView.renameWalletDrawer.renameEnabledAccounts')}
            </Text.Body.Large>
          </Box>
          <Flex flexDirection="column" gap="$16">
            {accountsData.map((account, index: number) => (
              <Box key={account.value.accountIndex} w="$fill">
                <TextBox
                  label={getDerivationPath(account.value.accountIndex)}
                  value={accountsData[index]?.value.metadata.name}
                  errorMessage={accountsData[index]?.errorMessage}
                  w="$fill"
                  onChange={(e) => handleOnChangeAccountData(e, index)}
                  data-testid={`rename-account-${index}`}
                />
              </Box>
            ))}
          </Flex>
        </Box>
      </>
    </Drawer>
  );
};
