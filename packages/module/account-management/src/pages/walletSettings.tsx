import { useUICustomisation } from '@lace-contract/app';
import { useTranslation } from '@lace-contract/i18n';
import { WalletId, WalletType } from '@lace-contract/wallet-repo';
import {
  NavigationControls,
  SheetRoutes,
  StackRoutes,
} from '@lace-lib/navigation';
import {
  Button,
  getIsWideLayout,
  Icon,
  Modal,
  PageContainerTemplate,
  PageHeader,
  renderLaceFooterLogo,
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

import { useDispatchLaceAction, useLaceSelector } from '../hooks';

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
    NavigationControls.sheets.navigate(SheetRoutes.RecoveryPhraseVerification, {
      walletId,
    });
  }, [walletId]);

  const handleEditWallet = useCallback(() => {
    NavigationControls.sheets.navigate(SheetRoutes.EditWallet, {
      walletId: walletId,
    });
  }, [navigation, walletId]);

  const openRemoveWalletModal = useCallback(() => {
    setIsRemoveModalVisible(true);
  }, []);

  const closeRemoveWalletModal = useCallback(() => {
    setIsRemoveModalVisible(false);
  }, []);

  const attemptRemoveWallet = useDispatchLaceAction(
    'accountManagement.attemptRemoveWallet',
  );

  const handleConfirmRemoveWallet = useCallback(() => {
    setIsRemoveModalVisible(false);
    attemptRemoveWallet({
      walletId: WalletId(walletId),
      authenticationPromptConfig: {
        cancellable: true,
        confirmButtonLabel:
          'authentication-prompt.confirm-button-label.remove-wallet',
        message: 'authentication-prompt.message.remove-wallet',
      },
    });
  }, [attemptRemoveWallet, walletId]);

  const handleNavigateToAddAccount = useCallback(() => {
    NavigationControls.sheets.navigate(SheetRoutes.AddAccount, {
      walletId: walletId,
      hasNestedScrolling: true,
    });
  }, [walletId]);

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
              rightNode={<Icon name="CaretRight" />}
              quickActions={{
                onCardPress: handleEditWallet,
              }}
              isCritical={false}
              iconWrapperStyle={{}}
            />
          );
        default:
          return null;
      }
    },
    [t, handleEditWallet, openRemoveWalletModal],
  );

  // Get settings list from customisations or use default
  const settingsList = useMemo((): WalletSettingsItem[] => {
    const firstCustomisation = walletSettingsCustomisations[0];
    let customSettings: WalletSettingsItem[] = [];

    if (firstCustomisation && 'settings' in firstCustomisation) {
      customSettings = firstCustomisation.settings || [];
    } else {
      // Default settings for wallet types without customisations
      customSettings = ['customise-wallet', 'remove-wallet'];
    }

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
          <View style={defaultStyles.pageHeaderButtonContainer}>
            <Button.Primary
              size="small"
              iconSize={18}
              preIconName="Plus"
              iconColor={theme.brand.white}
              label={t('v2.wallet-settings.add-account')}
              onPress={handleNavigateToAddAccount}
              testID="wallet-settings-add-account-button"
            />
          </View>
        </Row>
      </View>
    ),
    [
      walletName,
      accountsSubtitle,
      handleGoBack,
      t,
      handleNavigateToAddAccount,
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
              testID="wallet-settings-delete-button"
            />
          </View>
        </View>
        {renderLaceFooterLogo()}
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
