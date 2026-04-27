import { useAnalytics } from '@lace-contract/analytics';
import { useUICustomisation } from '@lace-contract/app';
import { useTranslation } from '@lace-contract/i18n';
import { FeatureIds } from '@lace-contract/network';
import {
  getBlockchainColor,
  getCurrentReceiveAddress,
  isTabbedAddressData,
  openUrl,
  shareString,
  useCopyToClipboard,
  useTheme,
} from '@lace-lib/ui-toolkit';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useDispatchLaceAction, useLaceSelector } from '../../hooks';

import type { Address, AnyAddress } from '@lace-contract/addresses';
import type { ReceiveSheetAddressData } from '@lace-contract/app';
import type { AnyAccount } from '@lace-contract/wallet-repo';
import type { ReceiveSheetAddressData as ReceiveToolkitAddressData } from '@lace-lib/ui-toolkit';

export const useReceiveSheet = () => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { trackEvent } = useAnalytics();

  const accountsResult = useLaceSelector('wallets.selectActiveNetworkAccounts');
  const activeAccountContext = useLaceSelector(
    'wallets.selectActiveAccountContext',
  );

  const accounts = Array.isArray(accountsResult) ? accountsResult : [];

  // Find the index of the active account to use as initial selection
  const activeAccountIndex = useMemo(() => {
    if (!activeAccountContext?.accountId) return 0;
    const index = accounts.findIndex(
      account => account.accountId === activeAccountContext.accountId,
    );
    return index >= 0 ? index : 0;
  }, [accounts, activeAccountContext?.accountId]);

  const [selectedAccountIndex, setSelectedAccountIndex] =
    useState(activeAccountIndex);
  const showToast = useDispatchLaceAction('ui.showToast');

  const isBuyAvailable = useLaceSelector(
    'network.selectIsFeatureAvailable',
    FeatureIds.BUY_FLOW,
  );

  const headerTitle = t('v2.sheets.receive.title');
  const shareText = t('v2.generic.btn.share');
  const buyAssetsText = t('v2.sheets.receive.buy-assets');
  const copyAddressText = t('v2.sheets.receive.copy-address');
  const actionText = ''; // TODO: complete with asset action text

  const selectedAccount = accounts[selectedAccountIndex];
  const accountAddresses = useLaceSelector(
    'addresses.selectByAccountId',
    selectedAccount?.accountId,
  );
  const isMidnightAccount = selectedAccount?.blockchainName === 'Midnight';

  const [receiveSheetAddressDataCustomisation] = useUICustomisation(
    'addons.loadReceiveSheetAddressDataCustomisations',
    selectedAccount?.blockchainName,
  );

  const addressData = useMemo((): ReceiveSheetAddressData | undefined => {
    if (selectedAccount && receiveSheetAddressDataCustomisation) {
      const customData =
        receiveSheetAddressDataCustomisation.getReceiveSheetAddressData(
          selectedAccount,
          accountAddresses,
        );
      if (
        !customData ||
        (Array.isArray(customData) && customData.length === 0)
      ) {
        return accountAddresses[0];
      } else {
        return customData;
      }
    }
    return accountAddresses[0];
  }, [receiveSheetAddressDataCustomisation, selectedAccount, accountAddresses]);

  const [selectedAddressTabIndex, setSelectedAddressTabIndex] = useState(0);

  const tabbedAddressItems = useMemo(() => {
    if (!addressData) return undefined;
    const toolkitData = addressData as ReceiveToolkitAddressData;
    return isTabbedAddressData(toolkitData) ? toolkitData : undefined;
  }, [addressData]);

  useEffect(() => {
    if (!tabbedAddressItems) return;
    if (selectedAddressTabIndex >= tabbedAddressItems.length) {
      setSelectedAddressTabIndex(
        Math.min(selectedAddressTabIndex, tabbedAddressItems.length - 1),
      );
    }
  }, [tabbedAddressItems, selectedAddressTabIndex]);

  const currentAddress = useMemo((): AnyAddress | undefined => {
    if (!addressData) return undefined;
    return getCurrentReceiveAddress(
      addressData as ReceiveToolkitAddressData,
      selectedAddressTabIndex,
    );
  }, [addressData, selectedAddressTabIndex]);

  const onSelectAddressTab = useCallback((tabIndex: number) => {
    setSelectedAddressTabIndex(tabIndex);
  }, []);

  const [sendFlowSheetCustomisation] = useUICustomisation(
    'addons.loadSendFlowSheetUICustomisations',
    {
      blockchainOfTheTransaction: selectedAccount?.blockchainName ?? 'Cardano',
    },
  );

  const nativeTokenInfo = useMemo(
    () =>
      sendFlowSheetCustomisation?.nativeTokenInfo?.({ networkType: 'mainnet' }),
    [sendFlowSheetCustomisation],
  );

  const onBuyAssetsPress = useCallback(() => {
    const banxaUrl = process.env.EXPO_PUBLIC_BANXA_URL;

    if (!banxaUrl) return;

    let url = banxaUrl;

    trackEvent('receive | buy assets | press');
    if (addressData && selectedAccount) {
      const coinType = nativeTokenInfo?.displayShortName;
      const currentAddr = Array.isArray(addressData)
        ? addressData[0]?.address?.address
        : addressData?.address;
      trackEvent('receive | buy assets | address | press');

      if (coinType && currentAddr) {
        const params = new URLSearchParams({
          coinType,
          walletAddress: String(currentAddr),
        });
        url = `${url}?${params.toString()}`;
        trackEvent('receive | buy assets | url | press');
      }
    }

    void openUrl({
      url,
      onError: () => {
        // Error handling is done in the openUrl utility
        trackEvent('receive | buy assets | url | error');
      },
    });
  }, [selectedAccount, addressData, nativeTokenInfo, trackEvent]);

  const getAddressInfo =
    selectedAccount &&
    receiveSheetAddressDataCustomisation?.getReceiveSheetAddressInfo?.(
      selectedAccount,
    );

  const { copyToClipboard } = useCopyToClipboard({
    onSuccess: () => {
      showToast({
        text: t('v2.generic.btn.copy-success'),
        color: 'positive',
        duration: 3,
        leftIcon: {
          name: 'Checkmark',
          size: 20,
          color: theme.background.primary,
        },
      });
      trackEvent('receive | copy address | success');
    },
    onError: () => {
      showToast({
        text: t('v2.generic.btn.copy-error'),
        color: 'negative',
        duration: 3,
        leftIcon: {
          name: 'AlertTriangle',
          size: 20,
          color: theme.background.primary,
        },
      });
      trackEvent('receive | copy address | error');
    },
  });

  const addresses = useMemo(() => {
    if (Array.isArray(addressData)) {
      return addressData.map(a => a.address.address);
    }
    return [addressData?.address].filter(Boolean) as Address[];
  }, [addressData]);

  const aliasEntries = useLaceSelector(
    'addresses.selectAddressAliases',
    addresses,
  );

  const getAccountName = useCallback(
    (account: AnyAccount): string => {
      return account?.metadata?.name ?? t('v2.generic.account.default-name');
    },
    [t],
  );

  const accountName = useMemo(
    () =>
      selectedAccount
        ? getAccountName(selectedAccount)
        : String(t('v2.generic.account.default-name')),
    [selectedAccount, getAccountName, t],
  );

  const userFallback = accountName.substring(0, 2).toUpperCase();

  const qrCodeBgColor = getBlockchainColor(selectedAccount?.blockchainName);

  const onSharePress = useCallback(
    (addr: string) => {
      trackEvent('receive | share | press');
      if (addr) {
        void shareString(addr);
      }
    },
    [trackEvent],
  );

  const dropdownItems = useMemo(
    () =>
      accounts.map((account, index) => {
        const name = getAccountName(account);
        // TODO: add balance when available
        return {
          id: `${account.accountId}-${index}`,
          text: name,
          avatar: {
            // TODO: add avatar when available
            fallback: name.substring(0, 2).toUpperCase(),
          },
        };
      }),
    [accounts, getAccountName],
  );

  const onSelectItem = useCallback(
    (index: number) => {
      setSelectedAccountIndex(index);
      trackEvent('receive | account | select | press', { index });
    },
    [setSelectedAccountIndex, trackEvent],
  );

  const onCopyAddressPress = (addr: string) => {
    copyToClipboard(addr);
    trackEvent('receive | copy address | press');
  };

  return {
    addressData,
    aliasEntries,
    dropdownItems,
    selectedAccountIndex,
    onSelectItem,
    headerTitle,
    shareText,
    buyAssetsText:
      isBuyAvailable && !isMidnightAccount ? buyAssetsText : undefined,
    onBuyAssetsPress:
      isBuyAvailable && !isMidnightAccount ? onBuyAssetsPress : undefined,
    theme,
    actionText,
    userFallback,
    accountName,
    copyAddressText,
    onCopyAddressPress,
    qrCodeBgColor,
    onSharePress,
    getAddressInfo,
    selectedAddressTabIndex,
    onSelectAddressTab,
    currentAddress,
  };
};
