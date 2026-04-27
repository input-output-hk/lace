import { useAnalytics } from '@lace-contract/analytics';
import {
  useAccountSupportsNfts,
  useNftViewReset,
  useUICustomisation,
} from '@lace-contract/app';
import { useTranslation } from '@lace-contract/i18n';
import { isSendFlowFormStep } from '@lace-contract/send-flow';
import {
  FEATURE_FLAG_TOKEN_PRICING,
  getTokenPriceId,
  TOKEN_PRICING_NETWORK_TYPE,
} from '@lace-contract/token-pricing';
import { SheetRoutes } from '@lace-lib/navigation';
import {
  getIsWideLayout,
  TIMEOUT_DURATION,
  useTheme,
} from '@lace-lib/ui-toolkit';
import {
  formatAmountToLocale,
  getTokenPriceDisplayProps,
} from '@lace-lib/util-render';
import { BigNumber } from '@lace-sdk/util';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { useWindowDimensions } from 'react-native';

import { useLaceSelector, useDispatchLaceAction } from '../../hooks';
import { useSendFlowNavigation } from '../../hooks/useSendFlowNavigation';

import type { TokenPrice } from '@lace-contract/token-pricing';
import type { AccountId } from '@lace-contract/wallet-repo';
import type { TokenUIData } from '@lace-lib/ui-toolkit';
import type { BlockchainName } from '@lace-lib/util-store';

export enum SelectedAssetView {
  Assets = 0,
  Nfts = 1,
}

export const useAddAssets = (accountId: AccountId, blockchainName: string) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { trackEvent } = useAnalytics();
  const { navigate } = useSendFlowNavigation();

  const [sendFlowSheetUICustomisation] = useUICustomisation(
    'addons.loadSendFlowSheetUICustomisations',
    { blockchainOfTheTransaction: blockchainName as BlockchainName },
  );

  const { featureFlags } = useLaceSelector('features.selectLoadedFeatures');
  const networkType = useLaceSelector('network.selectNetworkType');
  const allPrices = useLaceSelector('tokenPricing.selectPrices') as
    | Record<string, TokenPrice>
    | undefined;

  const currencyPreference = useLaceSelector(
    'tokenPricing.selectCurrencyPreference',
  );
  const currency = currencyPreference.name;

  const isTokenPricingEnabled = useMemo(
    () =>
      featureFlags.some(flag => flag.key === FEATURE_FLAG_TOKEN_PRICING) &&
      networkType === TOKEN_PRICING_NETWORK_TYPE,
    [featureFlags, networkType],
  );

  const accounts = useLaceSelector('wallets.selectActiveNetworkAccounts');
  const { accountSupportsNfts } = useAccountSupportsNfts({ accounts });

  const [isLoading, setIsLoading] = useState(false);
  const [selectedTokens, setSelectedTokens] = useState<TokenUIData[]>([]);
  const [selectedNfts, setSelectedNfts] = useState<Record<string, boolean>>({});
  const sendFlowState = useLaceSelector('sendFlow.selectSendFlowState');
  const dispatchFormDataChanged = useDispatchLaceAction(
    'sendFlow.formDataChanged',
  );

  const allTokens = useLaceSelector(
    'tokens.selectAggregatedTokensByAccountId',
    accountId,
  );

  const { width } = useWindowDimensions();

  const numberOfColumns = useMemo(() => {
    return getIsWideLayout(width) ? 4 : 3;
  }, [width]);

  const usedTokenIds = useMemo(() => {
    return isSendFlowFormStep(sendFlowState)
      ? sendFlowState.form.tokenTransfers.map(
          transfer => transfer.token.value.tokenId,
        )
      : [];
  }, [sendFlowState]);

  const availableTokens = useMemo(() => {
    return allTokens.filter(token => !usedTokenIds.includes(token.tokenId));
  }, [allTokens, usedTokenIds]);

  const getPriceProps = useCallback(
    (token: (typeof availableTokens)[number]) => {
      if (!isTokenPricingEnabled || !allPrices) return undefined;

      const priceId = getTokenPriceId(token);
      if (!priceId) return undefined;

      const priceData = allPrices[priceId];
      if (!priceData) return undefined;

      return getTokenPriceDisplayProps({
        available: token.available.toString(),
        decimals: token.decimals,
        price: priceData.price,
        isPriceStale: priceData.isStale,
      });
    },
    [allPrices, isTokenPricingEnabled],
  );

  const networkId = useLaceSelector(
    'network.selectActiveNetworkId',
    blockchainName as BlockchainName,
  );

  const recipientAddress = isSendFlowFormStep(sendFlowState)
    ? sendFlowState.form.address.value
    : '';

  const txRestrictions = useMemo(() => {
    if (!sendFlowSheetUICustomisation?.computeTxRestrictions || !networkId) {
      return undefined;
    }
    const existingTransferTokens = isSendFlowFormStep(sendFlowState)
      ? sendFlowState.form.tokenTransfers.map(transfer => ({
          blockchainSpecific: transfer.token.value.metadata?.blockchainSpecific,
        }))
      : [];
    return sendFlowSheetUICustomisation.computeTxRestrictions({
      tokens: availableTokens.map(token => ({
        tokenId: token.tokenId,
        blockchainSpecific: token.metadata?.blockchainSpecific,
      })),
      selectedTokenIds: selectedTokens.map(token => token.tokenId),
      existingTransferTokens,
      recipientAddress,
      networkId,
    });
  }, [
    sendFlowSheetUICustomisation,
    sendFlowState,
    availableTokens,
    selectedTokens,
    recipientAddress,
    networkId,
  ]);

  const formattedTokens = useMemo(() => {
    const nftTokens = availableTokens.filter(token => token.metadata?.isNft);

    return availableTokens.map((contractToken): TokenUIData => {
      const isTokenSelected = selectedTokens.some(
        t => t.tokenId === contractToken.tokenId,
      );
      const formattedAvailableBalance = formatAmountToLocale(
        contractToken.available,
        contractToken.decimals,
      );
      const formattedPendingBalance =
        BigNumber.valueOf(contractToken.pending) > 0
          ? formatAmountToLocale(contractToken.pending, contractToken.decimals)
          : undefined;
      const priceProps = getPriceProps(contractToken);

      let isNftSelected = false;
      if (contractToken.metadata?.isNft) {
        const nftIndex = nftTokens.findIndex(
          nft => nft.tokenId === contractToken.tokenId,
        );
        if (nftIndex !== -1) {
          isNftSelected = selectedNfts[`${nftIndex}`] || false;
        }
      }

      const isDisabled =
        txRestrictions?.tokenRestrictions.disabledTokenIds.has(
          contractToken.tokenId,
        ) ?? false;

      return {
        tokenId: contractToken.tokenId,
        metadata: contractToken.metadata,
        displayLongName: contractToken.displayLongName,
        displayShortName: contractToken.displayShortName,
        decimals: contractToken.decimals,
        availableBalance: formattedAvailableBalance,
        pendingBalanceText:
          formattedPendingBalance &&
          t('v2.token-item.pending', {
            amount: formattedPendingBalance,
          }),
        currency,
        ...priceProps,
        isSelected: isTokenSelected || isNftSelected,
        isDisabled,
      };
    });
  }, [
    t,
    availableTokens,
    selectedNfts,
    selectedTokens,
    currency,
    getPriceProps,
    txRestrictions,
  ]);
  // TODO: implement show balance warning
  // const showBalanceWarning = () => {
  //   setShouldShowBalanceWarning(true);
  // };

  // TODO: reload from stored state
  const [selectedAssetView, setSelectedAssetView] = useState<SelectedAssetView>(
    SelectedAssetView.Assets,
  );

  const loaderColor = theme.text.primary;

  const onAssetsSelectionChanged = useCallback(
    (asset: TokenUIData) => {
      if (!asset) return;
      trackEvent('send | add assets sheet | select', {
        tokenId: asset.tokenId,
      });

      setSelectedTokens(previous => {
        const isSelected = previous.some(t => t.tokenId === asset.tokenId);
        if (isSelected) {
          return previous.filter(t => t.tokenId !== asset.tokenId);
        } else {
          return [...previous, asset];
        }
      });
    },
    [trackEvent],
  );

  const onToggleNftSelection = (index: number) => {
    const nftKey = `${index}`;
    setSelectedNfts(previous => {
      const isCurrentlySelected = previous[nftKey] || false;
      return {
        ...previous,
        [nftKey]: !isCurrentlySelected,
      };
    });
    trackEvent('send | add assets sheet | toggle nft selection', { index });
  };

  const currentAccount = accounts.find(a => a.accountId === accountId);

  const shouldShowNfts = useMemo(() => {
    return currentAccount ? accountSupportsNfts(currentAccount) : false;
  }, [accountSupportsNfts, currentAccount]);

  // Reset to Assets view when NFT support changes (e.g., switching to Midnight account)
  useNftViewReset({
    shouldShowNfts,
    selectedAssetView,
    setSelectedAssetView,
    nftViewValue: SelectedAssetView.Nfts,
    defaultViewValue: SelectedAssetView.Assets,
  });

  const isBitcoin = false; // TODO: handle isBitcoin

  const restrictionMessages = txRestrictions?.tokenRestrictions.messages ?? [];

  const labels = {
    headerTitle: t('v2.send-flow.form.asset-select.title'),
    selectedLabel: t('v2.send-flow.form.asset-select.selected-label'),
    tokensLabel: t('v2.send-flow.form.asset-select.selected-label-tokens'),
    nftsLabel: !isBitcoin
      ? t('v2.send-flow.form.asset-select.selected-label-nfts')
      : t('v2.send-flow.form.asset-select.selected-label-bitctoin-nfts'),
    emptyStateMessage: t('v2.send-flow.form.asset-select.empty-state-message'),
    cancelLabel: t('v2.send-flow.asset-select-cancel-button'),
    confirmLabel: t('v2.send-flow.asset-select-confirm-button'),
    restrictionMessages,
  };

  const onClose = () => {
    trackEvent('send | add assets sheet | close');
    // Navigate back to Send sheet
    navigate(SheetRoutes.Send, {
      accountId,
    });
  };

  const onConfirm = useCallback(() => {
    const nftTokens = availableTokens.filter(token => token.metadata?.isNft);

    const selectedNftsArray = Object.entries(selectedNfts)
      .filter(([_, selected]) => selected)
      .map(([key]) => nftTokens[Number(key)])
      .filter(token => token !== undefined);

    const assetsSelected = [...selectedTokens, ...selectedNftsArray];

    const selectedAssets = assetsSelected
      .map(selectedToken => {
        const chosenToken = availableTokens.find(
          availableToken => availableToken.tokenId === selectedToken.tokenId,
        );
        return chosenToken;
      })
      .filter(
        (token): token is NonNullable<typeof token> => token !== undefined,
      );

    // Dispatch all selected tokens in a single action
    dispatchFormDataChanged({
      data: {
        fieldName: 'tokenTransfers.addTokens',
        tokens: selectedAssets,
      },
    });

    trackEvent('send | add assets sheet | confirm');

    // Navigate back to Send sheet
    navigate(SheetRoutes.Send, {
      accountId,
    });
  }, [
    dispatchFormDataChanged,
    availableTokens,
    selectedTokens,
    selectedNfts,
    trackEvent,
    navigate,
    accountId,
  ]);

  const actions = {
    onClose,
    onAssetsSelectionChanged,
    setSelectedAssetView,
    onToggleNftSelection,
    onConfirm,
  };

  const values = {
    selectedAssetView,
    availableTokens: formattedTokens.length > 0 ? formattedTokens : [],
    selectedTokens,
    selectedNfts,
    isLoading,
    loaderColor,
    shouldShowNfts,
    numberOfColumns,
  };

  useEffect(() => {
    setIsLoading(true); // TODO: handle loading state
    setTimeout(() => {
      setIsLoading(false);
    }, TIMEOUT_DURATION);
  }, []);

  return {
    labels,
    actions,
    values,
  };
};
