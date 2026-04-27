import { getCardanoNativeTokenInfoForNetwork } from '@lace-contract/cardano-context';
import { formatAmountToLocale } from '@lace-lib/util-render';
import { useMemo } from 'react';

import { useLaceSelector } from './storeHooks';

import type { BlockchainName } from '@lace-lib/util-store';

export type SelectedAccountForBalance = {
  accountId: string;
  blockchainName: BlockchainName;
};

/**
 * Returns the formatted native token balance for the selected account,
 * e.g. "1,234.56 ADA" or "0.00123456 BTC".
 * Used by both browser and mobile authorize-dapp flows.
 */
export const useSelectedAccountBalance = (
  selectedAccount: SelectedAccountForBalance | null,
): string => {
  const accountTokens = useLaceSelector(
    'tokens.selectAggregatedFungibleTokensByAccountId',
    selectedAccount?.accountId ?? '',
  );

  const networkType = useLaceSelector('network.selectNetworkType');

  return useMemo(() => {
    if (!selectedAccount || !accountTokens) return '';
    const { blockchainName } = selectedAccount;
    const nativeInfo = getCardanoNativeTokenInfoForNetwork(networkType);
    const nativeToken = accountTokens.find(
      (token: { tokenId: string }) =>
        blockchainName === 'Cardano' && token.tokenId === nativeInfo.tokenId,
    );
    const formattedAvailable = formatAmountToLocale(
      nativeToken?.available?.toString() ?? '0',
      nativeToken?.decimals ?? 0,
    );
    return nativeToken
      ? `${formattedAvailable} ${nativeInfo.displayShortName}`
      : '';
  }, [selectedAccount, accountTokens, networkType]);
};
