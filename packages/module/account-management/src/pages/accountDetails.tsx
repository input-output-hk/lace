import { useTranslation } from '@lace-contract/i18n';
import { AccountId, WalletId } from '@lace-contract/wallet-repo';
import {
  useTheme,
  Button,
  spacing,
  Modal,
  PageHeader,
  getIsWideLayout,
} from '@lace-lib/ui-toolkit';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';

import { AccountSettings } from '../components';
import { useDispatchLaceAction, useLaceSelector } from '../hooks';

import type { StackRoutes, StackScreenProps } from '@lace-lib/navigation';

export const AccountDetails = ({
  navigation,
  route: {
    params: { accountId, walletId },
  },
}: StackScreenProps<StackRoutes.AccountDetails>) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [isRemoveAccountModalVisible, setIsRemoveAccountModalVisible] =
    useState(false);
  const [
    isForbiddenRemoveAccountModalVisible,
    setIsForbiddenRemoveAccountModalVisible,
  ] = useState(false);
  const { width: windowWidth } = useWindowDimensions();
  const isWideLayout = getIsWideLayout(windowWidth);
  const account = useLaceSelector('wallets.selectAccountById', {
    accountId,
    walletId,
  });
  const wallet = useLaceSelector('wallets.selectWalletById', walletId);
  const testnetOptions = useLaceSelector('network.selectAllTestnetOptions');

  const isLastTestAccount = useMemo(() => {
    if (!account || !wallet) return false;
    if (account.networkType !== 'testnet') return false;
    const sameNetworkAccounts = wallet.accounts.filter(
      a => a.blockchainNetworkId === account.blockchainNetworkId,
    );
    return sameNetworkAccounts.length === 1;
  }, [account, wallet]);

  const testNetworkDisplayName = useMemo(() => {
    if (!account || account.networkType !== 'testnet') return '';
    const group = testnetOptions.find(
      g => g.blockchainName === account.blockchainName,
    );
    const option = group?.options.find(
      o => o.id === account.blockchainNetworkId,
    );
    return option
      ? String(t(option.label))
      : String(account.blockchainNetworkId);
  }, [account, testnetOptions, t]);

  const forbiddenRemoveAccountDescription = useMemo(() => {
    if (!account || !wallet) return '';
    const walletNameForMessage =
      wallet.metadata?.name || t('v2.wallet-settings.unknown-wallet');
    return t(
      'v2.account-details.remove-account.forbidden-last-testnet.description',
      '',
      {
        networkName: testNetworkDisplayName,
        walletName: walletNameForMessage,
      },
    );
  }, [account, wallet, t, testNetworkDisplayName]);

  const attemptRemoveAccount = useDispatchLaceAction(
    'accountManagement.attemptRemoveAccount',
  );

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const closeRemoveAccountModal = useCallback(() => {
    setIsRemoveAccountModalVisible(false);
  }, []);

  const closeForbiddenRemoveAccountModal = useCallback(() => {
    setIsForbiddenRemoveAccountModalVisible(false);
  }, []);

  const handlePressRemoveAccount = useCallback(() => {
    if (isLastTestAccount) setIsForbiddenRemoveAccountModalVisible(true);
    else setIsRemoveAccountModalVisible(true);
  }, [isLastTestAccount]);

  const handleConfirmRemoveAccount = useCallback(() => {
    setIsRemoveAccountModalVisible(false);
    attemptRemoveAccount({
      walletId: WalletId(walletId),
      accountId: AccountId(accountId),
      authenticationPromptConfig: {
        cancellable: true,
        confirmButtonLabel:
          'authentication-prompt.confirm-button-label.remove-account',
        message: 'authentication-prompt.message.remove-account',
      },
    });
  }, [attemptRemoveAccount, walletId, accountId]);

  if (!account) {
    return null;
  }

  const accountName =
    account.metadata?.name || t('v2.wallet-settings.unknown-wallet');
  const walletName =
    wallet?.metadata?.name || t('v2.wallet-settings.unknown-wallet');

  return (
    <>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header} testID="account-details-account-name">
          <PageHeader
            title={accountName}
            subtitle={walletName}
            onBackPress={handleGoBack}
            testID="account-details-page-header"
            compact
          />
        </View>
        <View style={styles.content}>
          {account && <AccountSettings account={account} />}
          <View
            style={[
              styles.deleteButtonContainer,
              isWideLayout && styles.deleteButtonContainerWide,
            ]}>
            <Button.Critical
              fullWidth
              preIconName="Delete"
              iconColor={theme.brand.white}
              label={t('v2.account-details.remove-account.button.remove')}
              onPress={handlePressRemoveAccount}
              testID="account-details-remove-button"
            />
          </View>
        </View>
      </ScrollView>
      <Modal
        visible={isRemoveAccountModalVisible}
        onClose={closeRemoveAccountModal}
        onCancel={closeRemoveAccountModal}
        onConfirm={handleConfirmRemoveAccount}
        icon="AlertSquare"
        iconSize={64}
        description={t('v2.account-details.remove-account.description')}
        cancelText={t('v2.account-details.remove-account.button.back')}
        confirmText={t('v2.account-details.remove-account.button.remove')}
      />
      <Modal
        visible={isForbiddenRemoveAccountModalVisible}
        onClose={closeForbiddenRemoveAccountModal}
        onConfirm={closeForbiddenRemoveAccountModal}
        icon="AlertSquare"
        iconSize={64}
        description={forbiddenRemoveAccountDescription}
        confirmText={t('v2.account-details.remove-account.button.back')}
      />
    </>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    paddingHorizontal: spacing.M,
  },
  header: {
    width: '100%',
  },
  content: {
    width: '100%',
    gap: spacing.S,
  },
  scrollContainer: {
    alignItems: 'center',
    gap: spacing.M,
    paddingVertical: spacing.M,
  },
  deleteButtonContainer: {
    width: '100%',
    marginTop: spacing.M,
  },
  deleteButtonContainerWide: {
    alignSelf: 'center',
    width: '60%',
  },
});
