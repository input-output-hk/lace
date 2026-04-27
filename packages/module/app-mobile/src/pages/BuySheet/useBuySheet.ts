import { useUICustomisation } from '@lace-contract/app';
import { useTranslation } from '@lace-contract/i18n';
import { openUrl } from '@lace-lib/ui-toolkit';
import { formatAmountToLocale } from '@lace-lib/util-render';
import { useCallback, useState, useMemo } from 'react';

import { useLaceSelector } from '../../hooks';

import type { AnyAccount } from '@lace-contract/wallet-repo';
import type { SheetRoutes, SheetScreenProps } from '@lace-lib/navigation';

export const useBuySheet = (props?: SheetScreenProps<SheetRoutes.Buy>) => {
  const { t } = useTranslation();
  const routeAccountId = props?.route?.params?.accountId;
  const accountsResult = useLaceSelector('wallets.selectActiveNetworkAccounts');
  const activeAccountContext = useLaceSelector(
    'wallets.selectActiveAccountContext',
  );

  const accounts: AnyAccount[] = Array.isArray(accountsResult)
    ? accountsResult
    : [];

  // Find the index of the active account to use as initial selection
  // Prefer route param accountId, fall back to active account context
  const activeAccountIndex = useMemo(() => {
    const targetAccountId = routeAccountId ?? activeAccountContext?.accountId;
    if (!targetAccountId) return 0;
    const index = accounts.findIndex(
      account => account.accountId === targetAccountId,
    );
    return index >= 0 ? index : 0;
  }, [accounts, routeAccountId, activeAccountContext?.accountId]);

  const [selectedAccountIndex, setSelectedAccountIndex] =
    useState(activeAccountIndex);

  const selectedAccount = accounts[selectedAccountIndex] || accounts[0];

  const [sendFlowSheetCustomisation] = useUICustomisation(
    'addons.loadSendFlowSheetUICustomisations',
    {
      blockchainOfTheTransaction: selectedAccount?.blockchainName ?? 'Cardano',
    },
  );

  // Banxa and similar ramps expect mainnet-style tickers (e.g. ADA, BTC), not testnet
  // labels (e.g. tADA). Token ids for native assets still match the user's network.
  const nativeTokenInfo = useMemo(
    () =>
      sendFlowSheetCustomisation?.nativeTokenInfo?.({ networkType: 'mainnet' }),
    [sendFlowSheetCustomisation],
  );

  const addressResult = useLaceSelector(
    'addresses.selectByAccountId',
    selectedAccount?.accountId,
  );

  const address = useMemo(() => {
    return Array.isArray(addressResult) ? addressResult[0] : addressResult;
  }, [addressResult]);

  // Get the tokens for the selected account
  const accountTokens = useLaceSelector(
    'tokens.selectAggregatedFungibleTokensByAccountId',
    selectedAccount?.accountId,
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

  const dropdownItems = useMemo(
    () =>
      accounts.length > 0
        ? accounts.map(account => {
            const name = getAccountName(account);
            return {
              id: account.accountId,
              text: name,
              avatar: {
                fallback: name.substring(0, 2).toUpperCase(),
              },
            };
          })
        : [
            {
              id: 'no-accounts',
              text: t('v2.buy-flow.no-accounts'),
              avatar: { fallback: t('v2.buy-flow.no-accounts-fallback') },
            },
          ],
    [accounts, getAccountName, t],
  );

  const actionText = useMemo(() => {
    if (!selectedAccount || !accountTokens || !nativeTokenInfo) return '';

    const { tokenId, displayShortName } = nativeTokenInfo;

    const nativeToken = accountTokens.find(token => token.tokenId === tokenId);

    const formattedAvailable = formatAmountToLocale(
      nativeToken?.available.toString() || '0',
      nativeToken?.decimals ?? nativeTokenInfo.decimals,
    );

    return nativeToken ? `${formattedAvailable} ${displayShortName}` : '';
  }, [selectedAccount, accountTokens, nativeTokenInfo]);

  const handleOpenBanxaUrl = useCallback(() => {
    const banxaUrl = process.env.EXPO_PUBLIC_BANXA_URL;

    if (!banxaUrl) {
      // Don't open URL if Banxa URL is not configured
      return;
    }

    let url = banxaUrl;

    if (address && selectedAccount) {
      const coinType = nativeTokenInfo?.displayShortName;

      if (!coinType) {
        // Use the base URL without parameters for unsupported blockchains
        void openUrl({
          url,
          onError: () => {
            // Error handling is done in the openUrl utility
          },
        });
        return;
      }

      const walletAddress = String(address.address);

      const params = new URLSearchParams({
        coinType,
        walletAddress,
      });

      url = `${url}?${params.toString()}`;
    }

    void openUrl({
      url,
      onError: () => {
        // Error handling is done in the openUrl utility
      },
    });
  }, [selectedAccount, address, nativeTokenInfo]);

  const handleAccountSelection = useCallback((index: number) => {
    setSelectedAccountIndex(index);
  }, []);

  return {
    accounts,
    selectedAccount,
    address,
    accountName,
    dropdownItems,
    actionText,
    handleOpenBanxaUrl,
    handleAccountSelection,
    t,
  };
};
