import { getAdaTokenTickerByNetwork } from '@lace-contract/cardano-context';
import {
  FEATURE_FLAG_TOKEN_PRICING,
  TOKEN_PRICING_NETWORK_TYPE,
} from '@lace-contract/token-pricing';
import { useEffect, useMemo, useState } from 'react';

import {
  inspectTransaction,
  slotToDateTime,
  type TokensMetadataMap,
  type SlotDateTime,
} from '../utils';

import { useLaceSelector } from './storeHooks';
import {
  useDappTxInspection,
  type TokenTransferValue,
} from './useDappTxInspection';

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
 * collateral, expiry, token pricing, and account info.
 *
 * Address-resolved `from`/`to` maps, collateral totals, and deposit figures
 * all come from `useDappTxInspection`, which runs the cardano-js-sdk
 * `tokenTransferInspector` + `transactionSummaryInspector` — the same
 * pipeline v1's `DappTransactionContainer` uses.
 */
export const useSignTxData = ({
  txHex,
}: UseSignTxDataParams): UseSignTxDataResult => {
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

  const [transactionInfo, setTransactionInfo] =
    useState<TransactionInfo | null>(null);
  const [transactionError, setTransactionError] = useState<string | null>(null);

  useEffect(() => {
    let isUnsubscribed = false;
    void inspectTransaction(txHex).then(result => {
      if (isUnsubscribed) return;
      setTransactionInfo(result.transactionInfo);
      setTransactionError(result.error);
    });
    return () => {
      isUnsubscribed = true;
    };
  }, [txHex]);

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

  const inspection = useDappTxInspection({ txHex });

  const isResolvingInputs =
    inspection.isLoading || (resolvedTransactionInputs?.isResolving ?? false);

  const collateralValue = inspection.summary?.collateral;

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
    fromAddresses: inspection.fromAddresses,
    toAddresses: inspection.toAddresses,
    tokensMetadata,
    collateralValue,
    isLoadingCollateral: inspection.isLoading,
    isResolvingInputs,
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
