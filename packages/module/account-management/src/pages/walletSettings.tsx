import { useUICustomisation } from '@lace-contract/app';
import { FEATURE_FLAG_WALLET_SECURITY_ALERTS } from '@lace-contract/cardano-context';
import { useTranslation } from '@lace-contract/i18n';
import { WalletType } from '@lace-contract/wallet-repo';
import {
  NavigationControls,
  SheetRoutes,
  StackRoutes,
} from '@lace-lib/navigation';
import {
  Button,
  getIsWideLayout,
  Icon,
  Loader,
  Modal,
  PageContainerTemplate,
  PageHeader,
  LaceFooterLogo,
  Row,
  SettingsCard,
  spacing,
  useTheme,
} from '@lace-lib/ui-toolkit';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

import { isVaultCapabilityEnabled } from '../capability-gating';
import {
  useDispatchLaceAction,
  useLaceSelector,
  useLoadModules,
} from '../hooks';

import type { WalletSettingsItem } from '@lace-contract/account-management';
import type { InMemoryWallet } from '@lace-contract/wallet-repo';
import type { StackScreenProps } from '@lace-lib/navigation';

const ORIGIN = 'add-wallet';

export const WalletSettings = ({
  route,
  navigation,
}: StackScreenProps<StackRoutes.WalletSettings>) => {
  const { walletId, origin } = route.params;
  const { t } = useTranslation();
  const wallet = useLaceSelector('wallets.selectWalletById', walletId);
  const wallets = useLaceSelector('wallets.selectAll');
  const { theme } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const isWideLayout = getIsWideLayout(windowWidth);
  const [isRemoveModalVisible, setIsRemoveModalVisible] = useState(false);
  const defaultStyles = useMemo(
    () => styles({ isWideLayout }),
    [theme, isWideLayout],
  );

  useEffect(() => {
    if (wallet) return;

    if (wallets.length === 0) {
      navigation.reset({
        index: 0,
        routes: [{ name: StackRoutes.OnboardingStart }],
      });
      return;
    }
  }, [wallet, wallets.length, navigation]);

  // Load UI customisations for this wallet type
  const walletSettingsCustomisations = useUICustomisation(
    'addons.loadWalletSettingsUICustomisations',
    { walletType: wallet?.type || WalletType.InMemory },
  );

  // Verification requires decrypting the stored mnemonic, which Nami-imported
  // wallets do not have.
  const isPassphraseVerificationNeeded = useMemo(() => {
    return (
      wallet?.type === WalletType.InMemory &&
      (wallet as InMemoryWallet).isPassphraseConfirmed === false &&
      Boolean((wallet as InMemoryWallet).encryptedRecoveryPhrase)
    );
  }, [wallet?.type, wallet]);
  const handleGoBack = useCallback(() => {
    if (origin === ORIGIN) {
      navigation.pop(2);
      return;
    }
    navigation.goBack();
  }, [navigation, origin]);

  // Handle recovery phrase verification with authentication prompt
  const handleRecoveryPhraseVerification = useCallback(() => {
    NavigationControls.navigate(SheetRoutes.RecoveryPhraseVerification, {
      walletId,
    });
  }, [walletId]);

  const requestRenameWalletCeremony = useDispatchLaceAction(
    'vault.renameWalletCeremonyRequested',
  );

  const handleEditWallet = useCallback(() => {
    requestRenameWalletCeremony({ walletId });
  }, [requestRenameWalletCeremony, walletId]);

  const openRemoveWalletModal = useCallback(() => {
    setIsRemoveModalVisible(true);
  }, []);

  const closeRemoveWalletModal = useCallback(() => {
    setIsRemoveModalVisible(false);
  }, []);

  const requestRemoveWalletCeremony = useDispatchLaceAction(
    'vault.removeWalletCeremonyRequested',
  );

  const handleConfirmRemoveWallet = useCallback(() => {
    setIsRemoveModalVisible(false);
    requestRemoveWalletCeremony({ walletId });
  }, [requestRemoveWalletCeremony, walletId]);

  const requestAddAccountCeremony = useDispatchLaceAction(
    'vault.addAccountCeremonyRequested',
  );
  // `undefined` until the capabilities promise resolves (ADR 52), so the entry
  // appears when it lands rather than flashing an entry the arm cannot serve.
  const vaultCapabilities = useLoadModules('addons.loadVaultCapabilities')?.[0];
  const canAddAccount = isVaultCapabilityEnabled(
    vaultCapabilities,
    'addAccount',
  );

  const handleNavigateToAddAccount = useCallback(() => {
    requestAddAccountCeremony({ walletId });
  }, [requestAddAccountCeremony, walletId]);

  // On the shell host every ceremony here waits on a host surface mount —
  // seconds on a cold service worker, and the remove flow closes its modal
  // first, so without this the page looks inert. The host mounts one surface at
  // a time, so any pending launch locks all three entries; only the pressed one
  // shows a spinner.
  const pendingCeremony = useLaceSelector('vault.selectPendingCeremony');
  const isCeremonyPending = pendingCeremony !== null;
  const isPendingForThisWallet = pendingCeremony?.walletId === walletId;
  const isRenamePending =
    isPendingForThisWallet && pendingCeremony?.ceremony === 'rename';
  const isRemoveWalletPending =
    isPendingForThisWallet && pendingCeremony?.ceremony === 'remove-wallet';
  const isAddAccountPending =
    isPendingForThisWallet && pendingCeremony?.ceremony === 'add-account';

  const accountsCount = useLaceSelector(
    'wallets.selectActiveNetworkAccountCountByWalletId',
    walletId,
  );
  const walletName =
    wallet?.metadata.name || t('v2.wallet-settings.unknown-wallet');
  const accountsSubtitle = useMemo(() => {
    const key =
      accountsCount === 1
        ? 'v2.wallet-settings.accounts-count.single'
        : 'v2.wallet-settings.accounts-count.multiple';
    return t(key, { count: accountsCount });
  }, [accountsCount, t]);

  const { featureFlags } = useLaceSelector('features.selectLoadedFeatures');
  const isSecurityAlertsEnabled = useMemo(
    () =>
      featureFlags.some(
        ({ key }) => key === FEATURE_FLAG_WALLET_SECURITY_ALERTS,
      ),
    [featureFlags],
  );

  const requestSecurityRescan = useDispatchLaceAction(
    'cardanoContext.requestSecurityRescan',
  );
  const showToast = useDispatchLaceAction('ui.showToast');

  const handleRecheckWalletKeys = useCallback(() => {
    if (!wallet) return;
    let dispatched = 0;
    for (const account of wallet.accounts) {
      if (account.blockchainName !== 'Cardano') continue;
      requestSecurityRescan({ accountId: account.accountId });
      dispatched += 1;
    }
    if (dispatched === 0) return;
    showToast({
      text: t('wallet-security-alerts.settings.toast-scan-started'),
      color: 'positive',
      duration: 3,
      leftIcon: {
        name: 'Shield',
        size: 20,
        color: theme.brand.white,
      },
    });
    navigation.goBack();
  }, [
    wallet,
    requestSecurityRescan,
    showToast,
    t,
    theme.brand.white,
    navigation,
  ]);

  // Standard component mapping for common wallet settings
  const createStandardComponent = useCallback(
    (settingId: string) => {
      switch (settingId) {
        case 'customise-wallet':
          return (
            <SettingsCard
              iconName="PencilEdit"
              key="customise-wallet"
              testID="wallet-settings-customise-wallet"
              title={t('v2.wallet-settings.customise-wallet.title')}
              rightNode={
                isRenamePending ? (
                  <Loader size={20} />
                ) : (
                  <Icon name="CaretRight" />
                )
              }
              quickActions={{
                onCardPress: isCeremonyPending ? undefined : handleEditWallet,
              }}
              isCritical={false}
              iconWrapperStyle={{}}
            />
          );
        case 'wallet-security-check':
          if (!isSecurityAlertsEnabled) return null;
          return (
            <SettingsCard
              iconName="Shield"
              key="wallet-security-check"
              testID="wallet-settings-wallet-security-check"
              title={t('wallet-security-alerts.settings.title')}
              description={t('wallet-security-alerts.settings.description')}
              rightNode={<Icon name="CaretRight" />}
              quickActions={{
                onCardPress: handleRecheckWalletKeys,
              }}
              isCritical={false}
              iconWrapperStyle={{}}
            />
          );
        default:
          return null;
      }
    },
    [
      t,
      handleEditWallet,
      openRemoveWalletModal,
      handleRecheckWalletKeys,
      isSecurityAlertsEnabled,
      isCeremonyPending,
      isRenamePending,
    ],
  );

  // Get settings list from customisations or use default
  const settingsList = useMemo((): WalletSettingsItem[] => {
    // EVERY matching customisation contributes, in registration order — more
    // than one module can add rows for the same wallet type (e.g. the vault's
    // recovery-phrase entry plus migrate-wallet's). Taking only the first
    // silently dropped every later contributor.
    let customSettings: WalletSettingsItem[] =
      walletSettingsCustomisations.flatMap(customisation =>
        'settings' in customisation ? customisation.settings || [] : [],
      );

    // The defaults stand in for the CORE rows, not for "no rows at all": a
    // module contributing one additive row (e.g. migrate-wallet) must not cost
    // a wallet type its customise and security-check rows just by matching.
    const DEFAULT_SETTINGS: WalletSettingsItem[] = [
      'customise-wallet',
      'wallet-security-check',
      'remove-wallet',
    ];
    const hasCoreSettings = customSettings.some(
      item =>
        (typeof item === 'string' ? item : item.id) === 'customise-wallet',
    );
    if (!hasCoreSettings) {
      customSettings = [...DEFAULT_SETTINGS, ...customSettings];
    }

    // The destructive action stays last no matter which contributor's rows
    // merged in after it.
    const settingId = (item: WalletSettingsItem) =>
      typeof item === 'string' ? item : item.id;
    customSettings = [
      ...customSettings.filter(item => settingId(item) !== 'remove-wallet'),
      ...customSettings.filter(item => settingId(item) === 'remove-wallet'),
    ];

    // Filter out show-recovery-phrase if passphrase is not confirmed
    if (
      wallet?.type === WalletType.InMemory &&
      (wallet as InMemoryWallet).isPassphraseConfirmed === false
    ) {
      customSettings = customSettings.filter(setting => {
        if (typeof setting === 'string') {
          return setting !== 'show-recovery-phrase';
        }
        return setting.id !== 'show-recovery-phrase';
      });
    }

    return customSettings;
  }, [walletSettingsCustomisations, wallet?.type, wallet]);

  // Render individual setting item
  const renderSettingItem = useCallback(
    (setting: WalletSettingsItem): React.ReactNode => {
      if (typeof setting === 'string') {
        // Setting is just an ID - create standard component
        return createStandardComponent(setting);
      } else {
        // Setting has custom component
        const { id, component: Component } = setting;
        return <Component key={id} walletId={walletId} />;
      }
    },
    [createStandardComponent, walletId],
  );

  const ListHeaderComponent = useCallback(
    () => (
      <View style={defaultStyles.header}>
        <Row justifyContent="space-between" gap={spacing.XS}>
          <View style={defaultStyles.pageHeaderContent}>
            <PageHeader
              title={walletName}
              subtitle={accountsSubtitle}
              onBackPress={handleGoBack}
              testID="wallet-settings-page-header"
              compact
            />
          </View>
          {canAddAccount ? (
            <View style={defaultStyles.pageHeaderButtonContainer}>
              <Button.Primary
                size="small"
                iconSize={18}
                preIconName="Plus"
                iconColor={theme.brand.white}
                label={t('v2.wallet-settings.add-account')}
                onPress={handleNavigateToAddAccount}
                disabled={isCeremonyPending}
                loading={isAddAccountPending}
                testID="wallet-settings-add-account-button"
              />
            </View>
          ) : null}
        </Row>
      </View>
    ),
    [
      walletName,
      accountsSubtitle,
      canAddAccount,
      handleGoBack,
      t,
      handleNavigateToAddAccount,
      isAddAccountPending,
      isCeremonyPending,
      theme,
      defaultStyles,
    ],
  );

  return (
    <PageContainerTemplate>
      <ListHeaderComponent />
      <ScrollView
        style={defaultStyles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={defaultStyles.contentContainer}>
        <View style={defaultStyles.settingsItems}>
          {/* Recovery phrase verification card - always on top when needed */}
          {isPassphraseVerificationNeeded && (
            <View style={defaultStyles.settingsItemCritical}>
              <SettingsCard
                iconName="AlertTriangle"
                key="recovery-phrase-verification-critical"
                testID="wallet-settings-recovery-phrase-critical"
                isWalletSettingsPage
                title={t(
                  'v2.wallet-settings.recovery-phrase-verification.title',
                )}
                description={t(
                  'v2.wallet-settings.recovery-phrase-verification.description',
                )}
                rightNode={
                  <Icon name="CaretRight" color={theme.data.negative} />
                }
                quickActions={{
                  onCardPress: handleRecoveryPhraseVerification,
                }}
                isCritical
                iconWrapperStyle={{}}
              />
            </View>
          )}
          {settingsList.map(
            (setting): React.ReactNode => renderSettingItem(setting),
          )}
          <View style={defaultStyles.deleteButtonContainer}>
            <Button.Critical
              fullWidth
              preIconName="Delete"
              iconColor={theme.brand.white}
              label={t('v2.wallet-settings.delete')}
              onPress={openRemoveWalletModal}
              disabled={isCeremonyPending}
              loading={isRemoveWalletPending}
              testID="wallet-settings-delete-button"
            />
          </View>
        </View>
        <LaceFooterLogo />
      </ScrollView>

      <Modal
        visible={isRemoveModalVisible}
        onClose={closeRemoveWalletModal}
        onCancel={closeRemoveWalletModal}
        onConfirm={handleConfirmRemoveWallet}
        icon="AlertSquare"
        iconSize={64}
        description={t('v2.wallet-settings.remove-modal.description')}
        cancelText={t('v2.wallet-settings.remove-modal.cancel')}
        confirmText={t('v2.wallet-settings.remove-modal.confirm')}
        testIdPrefix="wallet-settings-remove-wallet-modal"
      />
    </PageContainerTemplate>
  );
};

const styles = ({ isWideLayout }: { isWideLayout: boolean }) =>
  StyleSheet.create({
    container: {
      flex: 1,
      paddingVertical: spacing.S,
    },
    contentContainer: {
      justifyContent: 'space-between',
      height: '100%',
    },
    header: {
      gap: spacing.M,
    },
    pageHeaderContent: {
      flex: 1,
    },
    pageHeaderButtonContainer: {
      paddingTop: spacing.M,
      maxWidth: '45%',
    },
    deleteButtonContainer: {
      width: isWideLayout ? '60%' : '100%',
      marginTop: spacing.XL,
    },
    settingsItems: {
      gap: spacing.S,
      alignItems: 'center',
    },
    settingsItemCritical: {
      width: '100%',
      alignItems: 'center',
      marginBottom: spacing.S,
    },
  });
