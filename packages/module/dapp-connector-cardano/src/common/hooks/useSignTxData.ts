import { getAdaTokenTickerByNetwork } from '@lace-contract/cardano-context';
import {
  FEATURE_FLAG_TOKEN_PRICING,
  TOKEN_PRICING_NETWORK_TYPE,
} from '@lace-contract/token-pricing';
import { useEffect, useMemo, useState } from 'react';

import {
  constructTokenId,
  computeCollateralValue,
  inspectTransaction,
  slotToDateTime,
  type TokensMetadataMap,
  type SlotDateTime,
} from '../utils';

import { useDispatchLaceAction, useLaceSelector } from './storeHooks';
import {
  useTransactionSummary,
  type TokenTransferValue,
} from './useTransactionSummary';

import type { TransactionInfo } from '../utils/transaction-inspector';
import type { Cardano } from '@cardano-sdk/core';
import type { TokenPrice, TokenPriceId } from '@lace-contract/token-pricing';

export interface SignTxDataAccountInfo {
  name: string;
  blockchainName: string;
}

export interface UseSignTxDataParams {
  /** Transaction CBOR hex; use empty string when there is no request. */
  txHex: string;
}

export interface UseSignTxDataResult {
  transactionInfo: TransactionInfo | null;
  transactionError: string | null;
  ownAddresses: string[];
  addressToNameMap: Map<string, string>;
  fromAddresses: Map<Cardano.PaymentAddress, TokenTransferValue>;
  toAddresses: Map<Cardano.PaymentAddress, TokenTransferValue>;
  tokensMetadata: TokensMetadataMap;
  collateralValue: bigint | undefined;
  isLoadingCollateral: boolean;
  isResolvingInputs: boolean;
  expiresBy: SlotDateTime | null;
  coinSymbol: string;
  networkMagic: Cardano.NetworkMagic | undefined;
  accountInfo: SignTxDataAccountInfo | undefined;
  tokenPrices: Record<TokenPriceId, TokenPrice> | undefined;
  currencyTicker: string | undefined;
}

/**
 * Shared sign-tx data: transaction inspection, addresses, token metadata,
 * collateral, expiry, token pricing, and account info. Used by both browser popup and
 * mobile sheet; platform-specific flow (confirm/reject, result, navigation) stays in
 * the respective views.
 */
export const useSignTxData = ({
  txHex,
}: UseSignTxDataParams): UseSignTxDataResult => {
  const accountUtxos = useLaceSelector('cardanoContext.selectAccountUtxos');
  const chainId = useLaceSelector('cardanoContext.selectChainId');
  const eraSummaries = useLaceSelector('cardanoContext.selectEraSummaries');
  const allAddresses = useLaceSelector(
    'addresses.selectActiveNetworkAccountAddresses',
  );
  const allContacts = useLaceSelector('addressBook.selectAllContacts');
  const tokensMetadata = useLaceSelector('tokens.selectTokensMetadata');
  const resolvedTransactionInputs = useLaceSelector(
    'cardanoDappConnector.selectResolvedTransactionInputs',
  );
  const dispatchLoadTokenMetadata = useDispatchLaceAction(
    'cardanoContext.loadTokenMetadata',
  );
  const allPrices = useLaceSelector('tokenPricing.selectPrices');
  const currencyPreference = useLaceSelector(
    'tokenPricing.selectCurrencyPreference',
  );
  const networkType = useLaceSelector('network.selectNetworkType');
  const { featureFlags } = useLaceSelector('features.selectLoadedFeatures');
  const activeAccountContext = useLaceSelector(
    'wallets.selectActiveAccountContext',
  );
  const allAccounts = useLaceSelector('wallets.selectActiveNetworkAccounts');

  const { transactionInfo, error: transactionError } = useMemo(
    () => inspectTransaction(txHex),
    [txHex],
  );

  const [collateralValue, setCollateralValue] = useState<bigint | undefined>(
    undefined,
  );
  const [isLoadingCollateral, setIsLoadingCollateral] = useState(false);

  const ownAddresses = useMemo(() => {
    return allAddresses.map(addressObject => addressObject.address as string);
  }, [allAddresses]);

  const addressToNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const contact of allContacts) {
      for (const contactAddress of contact.addresses) {
        map.set(contactAddress.address as string, contact.name);
      }
    }
    return map;
  }, [allContacts]);

  const transactionSummary = useTransactionSummary({
    txHex,
    accountUtxos,
    chainId,
  });

  const mergedFromAddresses = useMemo(() => {
    if (!txHex) return new Map<Cardano.PaymentAddress, TokenTransferValue>();
    const merged = new Map<Cardano.PaymentAddress, TokenTransferValue>(
      transactionSummary.fromAddresses,
    );

    if (resolvedTransactionInputs?.foreignFromAddresses) {
      for (const [
        address,
        value,
      ] of resolvedTransactionInputs.foreignFromAddresses) {
        const existing = merged.get(address as Cardano.PaymentAddress);
        const coins = BigInt(value.coins);
        const assets = new Map<Cardano.AssetId, bigint>();

        for (const [assetId, amount] of value.assets) {
          assets.set(assetId as Cardano.AssetId, BigInt(amount));
        }

        if (existing) {
          const mergedAssets = new Map(existing.assets);
          for (const [assetId, amount] of assets) {
            const existingAmount = mergedAssets.get(assetId) ?? BigInt(0);
            mergedAssets.set(assetId, existingAmount + amount);
          }
          merged.set(address as Cardano.PaymentAddress, {
            coins: existing.coins + coins,
            assets: mergedAssets,
          });
        } else {
          merged.set(address as Cardano.PaymentAddress, { coins, assets });
        }
      }
    }

    return merged;
  }, [txHex, transactionSummary.fromAddresses, resolvedTransactionInputs]);

  const isResolvingAnyInputs =
    transactionSummary.isLoading ||
    (resolvedTransactionInputs?.isResolving ?? false);

  const allAssetIds = useMemo(() => {
    const assetIds = new Set<Cardano.AssetId>();

    for (const value of mergedFromAddresses.values()) {
      for (const assetId of value.assets.keys()) {
        assetIds.add(assetId);
      }
    }

    for (const value of transactionSummary.toAddresses.values()) {
      for (const assetId of value.assets.keys()) {
        assetIds.add(assetId);
      }
    }

    return Array.from(assetIds);
  }, [mergedFromAddresses, transactionSummary.toAddresses]);

  useEffect(() => {
    if (isResolvingAnyInputs) return;

    for (const assetId of allAssetIds) {
      const tokenId = constructTokenId(assetId);
      if (!tokensMetadata[tokenId]) {
        dispatchLoadTokenMetadata({ tokenId });
      }
    }
  }, [
    allAssetIds,
    tokensMetadata,
    dispatchLoadTokenMetadata,
    isResolvingAnyInputs,
  ]);

  const allUtxos = useMemo((): Cardano.Utxo[] => {
    return Object.values(accountUtxos).flat();
  }, [accountUtxos]);

  useEffect(() => {
    if (!transactionInfo || transactionSummary.isLoading) return;

    if (!transactionInfo.hasCollateral) {
      setCollateralValue(BigInt(0));
      return;
    }

    const localInputResolver: Cardano.InputResolver = {
      resolveInput: async (
        txIn: Cardano.TxIn,
      ): Promise<Cardano.TxOut | null> => {
        const localMatch = allUtxos.find(
          ([input]) => input.txId === txIn.txId && input.index === txIn.index,
        );
        return localMatch ? localMatch[1] : null;
      },
    };

    setIsLoadingCollateral(true);
    void computeCollateralValue(
      transactionInfo.collateralInputs,
      localInputResolver,
    ).then(value => {
      setCollateralValue(value);
      setIsLoadingCollateral(false);
    });
  }, [transactionInfo, allUtxos, transactionSummary.isLoading]);

  const expiresBy = useMemo((): SlotDateTime | null => {
    return slotToDateTime(transactionInfo?.ttl, eraSummaries);
  }, [transactionInfo?.ttl, eraSummaries]);

  const coinSymbol = useMemo(
    () => getAdaTokenTickerByNetwork(networkType),
    [networkType],
  );

  const isTokenPricingEnabled = useMemo(
    () =>
      featureFlags.some(flag => flag.key === FEATURE_FLAG_TOKEN_PRICING) &&
      networkType === TOKEN_PRICING_NETWORK_TYPE,
    [featureFlags, networkType],
  );

  const activeAccount = useMemo(() => {
    if (!activeAccountContext) return undefined;
    return allAccounts.find(
      account =>
        account.accountId === activeAccountContext.accountId &&
        account.walletId === activeAccountContext.walletId,
    );
  }, [activeAccountContext, allAccounts]);

  const accountInfo = useMemo((): SignTxDataAccountInfo | undefined => {
    if (!activeAccount) return undefined;
    return {
      name: activeAccount.metadata.name,
      blockchainName: activeAccount.blockchainName,
    };
  }, [activeAccount]);

  return {
    transactionInfo,
    transactionError,
    ownAddresses,
    addressToNameMap,
    fromAddresses: mergedFromAddresses,
    toAddresses: transactionSummary.toAddresses,
    tokensMetadata,
    collateralValue: isLoadingCollateral ? undefined : collateralValue,
    isLoadingCollateral,
    isResolvingInputs: isResolvingAnyInputs,
    expiresBy,
    coinSymbol,
    networkMagic: chainId?.networkMagic,
    accountInfo,
    tokenPrices: isTokenPricingEnabled ? allPrices : undefined,
    currencyTicker: isTokenPricingEnabled
      ? currencyPreference.ticker
      : undefined,
  };
};
