import React, { useMemo } from 'react';
import isUndefined from 'lodash/isUndefined';
import { useWalletStore } from '../../../../../stores';
import { CardanoTxOut, CurrencyInfo, TokensDetails } from '@src/types';
import { Wallet } from '@lace/cardano';
import { PriceResult, useFetchCoinPrice } from '@hooks';
import { walletBalanceTransformer } from '../../../../../api/transformers';
import { OutputSummaryList, SentAssetsList, Costs, OutputSummaryProps } from '@lace/core';
import { useBuiltTxState, useMetadata } from '../store';
import { useTranslation } from 'react-i18next';
import { Typography } from 'antd';
import styles from './SendTransactionSummary.module.scss';
import { useAddressBookContext, withAddressBookContext } from '@src/features/address-book/context';
import { AddressListType } from '@views/browser/features/activity';
import { useAnalyticsContext, useCurrencyStore } from '@providers';
import {
  MatomoEventActions,
  MatomoEventCategories,
  AnalyticsEventNames
} from '@providers/AnalyticsProvider/analyticsTracker';
import { getTokenAmountInFiat, parseFiat } from '@src/utils/assets-transformers';
import { useObservable, Banner } from '@lace/common';
import ExclamationIcon from '../../../../../assets/icons/exclamation-triangle-red.component.svg';

const { Text } = Typography;

type Unpacked<T> = T extends (infer U)[] ? U : T;
type AssetsListItem = Unpacked<SentAssetsList>;

const formatRow = ({
  output,
  assetInfo,
  cardanoCoin,
  fiatCurrency,
  prices
}: {
  output: CardanoTxOut;
  assetInfo: Map<Wallet.Cardano.AssetId, TokensDetails>;
  cardanoCoin: Wallet.CoinId;
  fiatCurrency: CurrencyInfo;
  prices?: PriceResult;
}): SentAssetsList => {
  const cardanoAmount = walletBalanceTransformer(output.value.coins.toString(), prices?.cardano?.price);

  const cardano: AssetsListItem = {
    assetAmount: `${cardanoAmount.coinBalance} ${cardanoCoin.symbol}`,
    fiatAmount: `${cardanoAmount.fiatBalance} ${fiatCurrency?.code}`
  };

  if (isUndefined(output.value.assets)) return [cardano];

  const mapEntries = [...output.value.assets.entries()];

  const assetList: SentAssetsList = [];
  for (const [id, balance] of mapEntries) {
    const asset = assetInfo?.get(id);
    if (asset) {
      const ticker = asset.nftMetadata?.name ?? asset.tokenMetadata?.ticker ?? asset.tokenMetadata?.name;
      const amount = Wallet.util.calculateAssetBalance(balance, asset);
      const tokenPriceInAda = prices?.tokens?.get(id)?.priceInAda;
      const fiatAmount =
        asset.tokenMetadata !== undefined && tokenPriceInAda
          ? `${parseFiat(Number(getTokenAmountInFiat(amount, tokenPriceInAda, prices?.cardano?.price)))} ${
              fiatCurrency?.code
            }`
          : '-';

      assetList.push({
        assetAmount: `${amount} ${ticker ?? asset.assetId}`,
        fiatAmount
      });
    }
  }

  return [cardano, ...assetList];
};

export const getFee = (
  fee: string,
  adaPrice: number,
  cardanoCoin: Wallet.CoinId,
  fiatCurrency: CurrencyInfo
): Costs => {
  if (!fee)
    return {
      ada: `0.00 ${cardanoCoin.symbol}`,
      fiat: `0.00 ${fiatCurrency?.code}`
    };

  const feeValue = walletBalanceTransformer(fee, adaPrice);

  return {
    ada: `${feeValue.coinBalance} ${cardanoCoin.symbol}`,
    fiat: `${feeValue.fiatBalance} ${fiatCurrency?.code}`
  };
};

interface SendTransactionSummaryProps {
  isPopupView?: boolean;
}

export const SendTransactionSummary = withAddressBookContext(
  ({ isPopupView = false }: SendTransactionSummaryProps): React.ReactElement => {
    const { t } = useTranslation();
    const { builtTxData: { uiTx: { fee, outputs } = {} } = {} } = useBuiltTxState();
    const [metadata] = useMetadata();
    const { inMemoryWallet } = useWalletStore();
    const { priceResult } = useFetchCoinPrice();
    const {
      getKeyAgentType,
      walletUI: { cardanoCoin }
    } = useWalletStore();
    const isInMemory = useMemo(
      () => getKeyAgentType() === Wallet.KeyManagement.KeyAgentType.InMemory,
      [getKeyAgentType]
    );
    const isTrezor = useMemo(() => getKeyAgentType() === Wallet.KeyManagement.KeyAgentType.Trezor, [getKeyAgentType]);

    const { list: addressList } = useAddressBookContext();
    const analytics = useAnalyticsContext();
    const { fiatCurrency } = useCurrencyStore();

    const assetsInfo = useObservable(inMemoryWallet.assetInfo$);

    const outputSummaryListTranslation = {
      recipientAddress: t('core.outputSummaryList.recipientAddress'),
      sending: t('core.outputSummaryList.sending'),
      output: t('core.outputSummaryList.output'),
      metadata: t('core.outputSummaryList.metaData'),
      deposit: t('core.outputSummaryList.deposit'),
      txFee: t('core.outputSummaryList.txFee')
    };

    const addressToNameMap = useMemo(
      () => new Map<string, string>(addressList?.map((item: AddressListType) => [item.address, item.name])),
      [addressList]
    );

    const rows = [...(outputs?.values() ?? [])].map((item) => ({
      list: formatRow({ output: item, assetInfo: assetsInfo, cardanoCoin, fiatCurrency, prices: priceResult }),
      recipientAddress: item.address.toString(),
      recipientName: addressToNameMap?.get(item.address.toString()) || item.handle
    }));

    // Where do we get the deposit field? LW-1363
    return (
      <>
        <OutputSummaryList
          rows={rows as OutputSummaryProps[]}
          txFee={{
            ...getFee(fee?.toString(), priceResult?.cardano?.price, cardanoCoin, fiatCurrency),
            tootipText: t('send.theAmountYoullBeChargedToProcessYourTransaction')
          }}
          metadata={metadata}
          translations={outputSummaryListTranslation}
          onDepositTooltipHover={() =>
            analytics.sendEventToMatomo({
              action: MatomoEventActions.HOVER_EVENT,
              category: MatomoEventCategories.SEND_TRANSACTION,
              name: AnalyticsEventNames.SendTransaction.SEE_TX_DEPOSIT_INFO
            })
          }
          onFeeTooltipHover={() =>
            analytics.sendEventToMatomo({
              action: MatomoEventActions.HOVER_EVENT,
              category: MatomoEventCategories.SEND_TRANSACTION,
              name: AnalyticsEventNames.SendTransaction.SEE_TX_FEE_INFO
            })
          }
        />
        {!isInMemory && !isPopupView && (
          <Text className={styles.connectLedgerText}>
            {isTrezor ? t('send.connectYourTrezor') : t('send.connectYourLedger')}
          </Text>
        )}
        {isTrezor && (
          <Banner
            className={styles.banner}
            message={t('send.trezorDoesNotDupportDecimals')}
            withIcon
            customIcon={<ExclamationIcon style={{ height: '72px' }} />}
          />
        )}
      </>
    );
  }
);
