import { getAccountIndex } from '@lace-contract/account-management';
import { useAnalytics } from '@lace-contract/analytics';
import { useUICustomisation } from '@lace-contract/app';
import { resolveAccountNameSuffix } from '@lace-contract/cardano-context';
import { useTranslation } from '@lace-contract/i18n';
import { WalletType } from '@lace-contract/wallet-repo';
import {
  NavigationControls,
  SheetRoutes,
  StackRoutes,
  TabRoutes,
} from '@lace-lib/navigation';
import {
  Button,
  spacing,
  WalletHierarchy,
  Blockchains,
  useTheme,
  Icon,
  PageHeaderSection,
  PageContainerTemplate,
  usePageHeaderCollapseScroll,
} from '@lace-lib/ui-toolkit';
import React, { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { useDispatchLaceAction, useLaceSelector } from '../hooks';

import type { TranslationKey } from '@lace-contract/i18n';
import type {
  AnyAccount,
  AnyWallet,
  InMemoryWallet,
  WalletId,
} from '@lace-contract/wallet-repo';
import type { TabScreenProps } from '@lace-lib/navigation';
import type { WalletHierarchyItem } from '@lace-lib/ui-toolkit';
import type { BlockchainName } from '@lace-lib/util-store';

/** Display order for account groups in Account Center (edit this list to change ordering). */
const ACCOUNT_CENTER_BLOCKCHAIN_ORDER = [
  'Midnight',
  'Cardano',
  'Bitcoin',
] as const satisfies readonly BlockchainName[];

const accountCenterBlockchainRank = (blockchainName: BlockchainName) => {
  const rank = ACCOUNT_CENTER_BLOCKCHAIN_ORDER.indexOf(blockchainName);
  return rank === -1 ? ACCOUNT_CENTER_BLOCKCHAIN_ORDER.length : rank;
};

export const AccountCenter = ({
  navigation,
}: TabScreenProps<TabRoutes.AccountCenter>) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { trackEvent } = useAnalytics();
  const wallets: AnyWallet[] = useLaceSelector(
    'wallets.selectActiveNetworkWallets',
  );
  const visibleAccountsResult = useLaceSelector(
    'wallets.selectActiveNetworkAccounts',
  );
  const visibleAccounts = Array.isArray(visibleAccountsResult)
    ? visibleAccountsResult
    : [];
  const visibleAccountIds = useMemo(
    () => new Set(visibleAccounts.map(account => account.accountId)),
    [visibleAccounts],
  );

  const flaggedExploitsByAccount = useLaceSelector(
    'cardanoContext.selectFlaggedExploitsByAccount',
  );
  const { featureFlags } = useLaceSelector('features.selectLoadedFeatures');

  const clearAccountStatus = useDispatchLaceAction(
    'accountManagement.clearAccountStatus',
  );

  const accountCenterWalletsUICustomisations = useUICustomisation(
    'addons.loadAccountCenterWalletsUICustomisations',
  );

  const handleAddWallet = useCallback(() => {
    trackEvent('account management | add wallet | press');
    navigation.navigate(StackRoutes.AddWallet);
  }, [navigation, trackEvent]);

  const handleWalletSettings = useCallback(
    (walletId: WalletId) => {
      const wallet = wallets.find(w => w.walletId === walletId);
      trackEvent(
        'account management | wallet settings | press',
        wallet
          ? {
              walletType: wallet.type,
              accountCount: wallet.accounts.length,
              blockchains: [
                ...new Set(wallet.accounts.map(a => a.blockchainName)),
              ].sort(),
            }
          : undefined,
      );
      navigation.navigate(StackRoutes.WalletSettings, { walletId });
    },
    [navigation, trackEvent, wallets],
  );

  const handleAddAccount = useCallback(
    (walletId: string) => {
      const wallet = wallets.find(w => w.walletId === walletId);
      trackEvent(
        'account management | add account | press',
        wallet
          ? {
              walletType: wallet.type,
              existingAccountCount: wallet.accounts.length,
              existingBlockchains: [
                ...new Set(wallet.accounts.map(a => a.blockchainName)),
              ].sort(),
            }
          : undefined,
      );
      clearAccountStatus();
      NavigationControls.navigate(SheetRoutes.AddAccount, {
        walletId,
        hasNestedScrolling: true,
      });
    },
    [clearAccountStatus, trackEvent, wallets],
  );

  const handleAccountPress = useCallback(
    ({ walletId, accountId }: { walletId: string; accountId: string }) => {
      const wallet = wallets.find(w => w.walletId === walletId);
      const account = wallet?.accounts.find(a => a.accountId === accountId);
      trackEvent(
        'account management | account details | press',
        wallet && account
          ? {
              walletType: wallet.type,
              blockchain: account.blockchainName,
              networkType: account.networkType,
              accountIndex: getAccountIndex(account),
            }
          : undefined,
      );
      navigation.navigate(StackRoutes.AccountDetails, { accountId, walletId });
    },
    [navigation, trackEvent, wallets],
  );

  const handleAtRiskPress = useCallback((accountId: string) => {
    NavigationControls.navigate(StackRoutes.Home, {
      screen: TabRoutes.Portfolio,
      params: { focusAccountId: accountId },
    });
  }, []);

  const walletIconMap: Record<WalletType, React.JSX.Element> = useMemo(
    () => ({
      [WalletType.HardwareLedger]: <Icon name="HardwareWallet" />,
      [WalletType.HardwareTrezor]: <Icon name="HardwareWallet" />,
      [WalletType.InMemory]: <Icon name="BinaryCode" />,
      [WalletType.LazyInMemory]: <Icon name="BinaryCode" />,
      [WalletType.MultiSig]: <Icon name="Wallet" />,
    }),
    [],
  );

  const getWalletIcon = (walletType: WalletType) =>
    walletIconMap[walletType] ?? <Icon name="Wallet" />;

  const getBlockchainIcon = useCallback((blockchainName: BlockchainName) => {
    const blockchainMap = {
      Bitcoin: <Blockchains.Bitcoin width={12} height={12} />,
      Cardano: <Blockchains.Cardano width={12} height={12} />,
      Midnight: <Blockchains.Midnight width={12} height={12} />,
    };
    return (
      blockchainMap[blockchainName as keyof typeof blockchainMap] || (
        <Blockchains.Bitcoin width={12} height={12} />
      )
    );
  }, []);

  const convertWalletToHierarchyItems = useCallback(
    (wallet: AnyWallet): WalletHierarchyItem[] => {
      return wallet.accounts
        .filter(account => visibleAccountIds.has(account.accountId))
        .sort((a, b) => {
          const chainA = accountCenterBlockchainRank(a.blockchainName);
          const chainB = accountCenterBlockchainRank(b.blockchainName);
          return chainA !== chainB
            ? chainA - chainB
            : getAccountIndex(a) - getAccountIndex(b);
        })
        .map((account: AnyAccount) => {
          const suffixInfo = resolveAccountNameSuffix(
            flaggedExploitsByAccount[account.accountId] ?? [],
            featureFlags,
          );
          const suffix = suffixInfo
            ? suffixInfo.override ?? t(suffixInfo.copyKey as TranslationKey)
            : undefined;
          return {
            id: account.accountId,
            title: account.metadata.name,
            suffix,
            subtitle: account.blockchainName,
            icon: getBlockchainIcon(account.blockchainName),
            // TODO: Add image url when available
            image: '',
          };
        });
    },
    [
      getBlockchainIcon,
      visibleAccountIds,
      flaggedExploitsByAccount,
      featureFlags,
      t,
    ],
  );

  const renderWallet = useCallback(
    ({ item: wallet }: { item: AnyWallet }) => {
      // Nami-imported wallets have no mnemonic to verify, so they never
      // surface the unconfirmed-passphrase badge.
      const isPassphraseUnconfirmed =
        wallet.type === WalletType.InMemory &&
        (wallet as InMemoryWallet).isPassphraseConfirmed === false &&
        Boolean((wallet as InMemoryWallet).encryptedRecoveryPhrase);
      return (
        <WalletHierarchy
          showAlert={isPassphraseUnconfirmed}
          headerIcon={getWalletIcon(wallet.type)}
          title={wallet.metadata.name}
          actionButtonLabel={t('v2.generic.btn.settings')}
          addButtonLabel={t('v2.account-management.addAccount')}
          items={convertWalletToHierarchyItems(wallet)}
          onActionButtonPress={() => {
            handleWalletSettings(wallet.walletId);
          }}
          onAddButtonPress={() => {
            handleAddAccount(wallet.walletId);
          }}
          onItemPress={(accountId: string) => {
            handleAccountPress({ walletId: wallet.walletId, accountId });
          }}
          onItemSuffixPress={(accountId: string) => {
            handleAtRiskPress(accountId);
          }}
        />
      );
    },
    [
      getWalletIcon,
      t,
      convertWalletToHierarchyItems,
      handleWalletSettings,
      handleAddAccount,
      handleAccountPress,
      handleAtRiskPress,
    ],
  );

  const keyExtractor = (wallet: AnyWallet) => wallet.walletId;

  const { collapseScrollY, onScroll } = usePageHeaderCollapseScroll();

  const headerSection = useMemo(
    () => (
      <PageHeaderSection
        title={t('v2.account-management.title')}
        subtitle={t('v2.account-management.subtitle')}
        testID="account-center-header-section"
        pageHeaderTestID="account-center-header"
        collapseScrollY={collapseScrollY}
        stickyInScrollParent>
        <Button.Primary
          fullWidth
          preNode={<Icon name="Plus" color={theme.brand.white} />}
          label={t('v2.account-management.addWallet')}
          onPress={handleAddWallet}
          testID="add-wallet-btn"
        />
      </PageHeaderSection>
    ),
    [handleAddWallet, t, theme, collapseScrollY],
  );

  const ListFooterComponent = useCallback(
    () => (
      <>
        {accountCenterWalletsUICustomisations.map(({ Wallets, key }) => (
          <Wallets key={key} />
        ))}
      </>
    ),
    [accountCenterWalletsUICustomisations],
  );

  return (
    <PageContainerTemplate>
      <View style={styles.fillSpace}>
        {headerSection}
        <Animated.FlatList
          style={styles.list}
          testID="account-center-screen"
          accessibilityLabel="AccountCenter"
          contentContainerStyle={styles.contentContainer}
          data={wallets}
          renderItem={renderWallet}
          keyExtractor={keyExtractor}
          ListFooterComponent={ListFooterComponent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          showsVerticalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
        />
      </View>
    </PageContainerTemplate>
  );
};

const styles = StyleSheet.create({
  fillSpace: {
    flex: 1,
  },
  list: {
    flex: 1,
    marginHorizontal: -spacing.M,
    marginTop: -spacing.M,
  },
  contentContainer: {
    paddingTop: spacing.M,
    paddingBottom: spacing.XXXXL,
    paddingHorizontal: spacing.M,
  },
  separator: {
    height: spacing.L,
  },
});
