import { getAccountIndex } from '@lace-contract/account-management';
import { useAnalytics } from '@lace-contract/analytics';
import { useUICustomisation } from '@lace-contract/app';
import { useTranslation } from '@lace-contract/i18n';
import { WalletType } from '@lace-contract/wallet-repo';
import {
  NavigationControls,
  SheetRoutes,
  StackRoutes,
} from '@lace-lib/navigation';
import {
  Button,
  spacing,
  WalletHierarchy,
  Blockchains,
  useTheme,
  Icon,
  PageHeader,
  PageContainerTemplate,
  usePageHeaderCollapseScroll,
} from '@lace-lib/ui-toolkit';
import React, { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { useDispatchLaceAction, useLaceSelector } from '../hooks';

import type {
  AnyAccount,
  AnyWallet,
  InMemoryWallet,
  WalletId,
} from '@lace-contract/wallet-repo';
import type { TabRoutes, TabScreenProps } from '@lace-lib/navigation';
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
      trackEvent('account management | wallet settings | press', { walletId });
      navigation.navigate(StackRoutes.WalletSettings, { walletId });
    },
    [navigation, trackEvent],
  );

  const handleAddAccount = useCallback(
    (walletId: string) => {
      trackEvent('account management | add account | press', { walletId });
      clearAccountStatus();
      NavigationControls.sheets.navigate(SheetRoutes.AddAccount, {
        walletId,
        hasNestedScrolling: true,
      });
    },
    [clearAccountStatus, trackEvent],
  );

  const handleAccountPress = useCallback(
    ({ walletId, accountId }: { walletId: string; accountId: string }) => {
      trackEvent('account management | account details | press', {
        walletId,
        accountId,
      });
      navigation.navigate(StackRoutes.AccountDetails, { accountId, walletId });
    },
    [navigation, trackEvent],
  );

  const walletIconMap: Record<WalletType, React.JSX.Element> = useMemo(
    () => ({
      [WalletType.HardwareLedger]: <Icon name="HardwareWallet" />,
      [WalletType.HardwareTrezor]: <Icon name="HardwareWallet" />,
      [WalletType.InMemory]: <Icon name="BinaryCode" />,
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
        .map((account: AnyAccount) => ({
          id: account.accountId,
          title: account.metadata.name,
          subtitle: account.blockchainName,
          icon: getBlockchainIcon(account.blockchainName),
          // TODO: Add image url when available
          image: '',
        }));
    },
    [getBlockchainIcon, visibleAccountIds],
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
        <View>
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
          />
        </View>
      );
    },
    [
      getWalletIcon,
      t,
      convertWalletToHierarchyItems,
      handleWalletSettings,
      handleAddAccount,
      handleAccountPress,
    ],
  );

  const keyExtractor = (wallet: AnyWallet) => wallet.walletId;

  const { collapseScrollY, onScroll } = usePageHeaderCollapseScroll();

  const headerSection = useMemo(
    () => (
      <>
        <PageHeader
          title={t('v2.account-management.title')}
          subtitle={t('v2.account-management.subtitle')}
          testID={'account-center-header'}
          collapseScrollYProp={collapseScrollY}
        />
        <View style={styles.header}>
          <Button.Primary
            fullWidth
            preNode={<Icon name="Plus" color={theme.brand.white} />}
            label={t('v2.account-management.addWallet')}
            onPress={handleAddWallet}
            testID="add-wallet-btn"
          />
        </View>
      </>
    ),
    [handleAddWallet, t, theme, styles.header, collapseScrollY],
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
          style={styles.fillSpace}
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
  contentContainer: {
    paddingBottom: spacing.XXXXL,
  },
  header: {
    marginBottom: spacing.L,
  },
  separator: {
    height: spacing.S,
  },
});
