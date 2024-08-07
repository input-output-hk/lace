import React, { useMemo } from 'react';
import { useWalletStore } from '@stores';
import { CurrencyInfo } from '@src/types';
import { Wallet } from '@lace/cardano';
import { useFetchCoinPrice } from '@hooks';
import { walletBalanceTransformer } from '@src/api/transformers';
import { OutputSummaryList, Costs, OutputSummaryProps } from '@lace/core';
import { useBuiltTxState, useMetadata } from '../store';
import { useTranslation } from 'react-i18next';
import { Typography } from 'antd';
import styles from './SendTransactionSummary.module.scss';
import { useAddressBookContext, withAddressBookContext } from '@src/features/address-book/context';
import { AddressListType } from '@views/browser/features/activity';
import { useCurrencyStore } from '@providers';
import { useObservable, Banner } from '@lace/common';
import ExclamationIcon from '../../../../../assets/icons/exclamation-triangle-red.component.svg';
import { WalletType } from '@cardano-sdk/web-extension';
import { eraSlotDateTime } from '@src/utils/era-slot-datetime';
import { getAllWalletsAddresses } from '@src/utils/get-all-wallets-addresses';
import { walletRepository } from '@lib/wallet-api-ui';
import { formatRow } from '../helpers';
import SharedWalletSendTransactionSummary from '@views/browser/features/send-transaction/components/SharedWalletSendTransactionSummary';

const { Text } = Typography;

interface SendTransactionSummaryProps {
  isPopupView?: boolean;
}

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

export const SendTransactionSummary = withAddressBookContext(
  ({ isPopupView = false }: SendTransactionSummaryProps): React.ReactElement => {
    const { t } = useTranslation();
    const { builtTxData: { uiTx: { fee, outputs, handleResolutions, validityInterval } = {} } = {} } =
      useBuiltTxState();
    const [metadata] = useMetadata();
    const {
      inMemoryWallet,
      isHardwareWallet,
      walletType,
      walletUI: { cardanoCoin },
      isSharedWallet
    } = useWalletStore();
    const { priceResult } = useFetchCoinPrice();
    const isTrezor = walletType === WalletType.Trezor;

    const { list: addressList } = useAddressBookContext();
    const { fiatCurrency } = useCurrencyStore();

    const assetsInfo = useObservable(inMemoryWallet.assetInfo$);
    const eraSummaries = useObservable(inMemoryWallet.eraSummaries$);
    const feeValue = walletBalanceTransformer(fee.toString(), priceResult.cardano.price);

    const outputSummaryListTranslation = {
      recipientAddress: t('core.outputSummaryList.recipientAddress'),
      sending: t('core.outputSummaryList.sending'),
      output: t('core.outputSummaryList.output'),
      metadata: t('core.outputSummaryList.metaData'),
      deposit: t('core.outputSummaryList.deposit'),
      txFee: t('core.outputSummaryList.txFee'),
      expiresBy: t('core.outputSummaryList.expiresBy'),
      expiresByTooltip: t('core.outputSummaryList.expiresByTooltip'),
      noLimit: t('core.outputSummaryList.noLimit'),
      utc: t('core.outputSummaryList.utc')
    };

    const addressToNameMap = useMemo(
      () => new Map<string, string>(addressList?.map((item: AddressListType) => [item.address, item.name])),
      [addressList]
    );

    const rows = [...(outputs?.values() ?? [])].map<OutputSummaryProps>((item) => {
      const handle =
        item.handleResolution?.handle ||
        handleResolutions.find(({ cardanoAddress }) => cardanoAddress === item.address)?.handle;
      return {
        list: formatRow({ output: item, assetInfo: assetsInfo, cardanoCoin, fiatCurrency, prices: priceResult }),
        recipientAddress: item.address,
        recipientName: addressToNameMap?.get(handle || item.address) || handle
      };
    });

    const ownAddresses = useObservable(inMemoryWallet.addresses$)?.map((a) => a.address);
    const allWalletsAddresses = getAllWalletsAddresses(useObservable(walletRepository.wallets$));

    if (isSharedWallet) {
      return <SharedWalletSendTransactionSummary rows={rows} fee={feeValue.coinBalance} />;
    }

    // Where do we get the deposit field? LW-1363
    return (
      <>
        <OutputSummaryList
          rows={rows}
          expiresBy={eraSlotDateTime(eraSummaries, validityInterval?.invalidHereafter)}
          txFee={{
            ...getFee(fee?.toString(), priceResult?.cardano?.price, cardanoCoin, fiatCurrency),
            tootipText: t('send.theAmountYoullBeChargedToProcessYourTransaction')
          }}
          metadata={metadata}
          translations={outputSummaryListTranslation}
          ownAddresses={allWalletsAddresses.length > 0 ? allWalletsAddresses : ownAddresses}
        />
        {isHardwareWallet && !isPopupView && (
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
