/* eslint-disable sonarjs/cognitive-complexity */
/* eslint-disable complexity */
import React, { useMemo, useState } from 'react';
import { useWalletStore } from '@stores';
import { CurrencyInfo } from '@src/types';
import { Wallet } from '@lace/cardano';
import { useFetchCoinPrice, useSharedWalletData } from '@hooks';
import { walletBalanceTransformer } from '@src/api/transformers';
import {
  OutputSummaryList,
  Costs,
  OutputSummaryProps,
  InfoBar,
  CosignersList,
  ActivityDetailHeader,
  Transaction,
  ActivityStatus
} from '@lace/core';
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
import { Box, SummaryExpander, Flex } from '@input-output-hk/lace-ui-toolkit';

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
    const [isCosignersOpen, setIsCosignersOpen] = useState(true);
    const [metadata] = useMetadata();
    const {
      inMemoryWallet,
      isHardwareWallet,
      walletType,
      walletUI: { cardanoCoin },
      isSharedWallet,
      activityDetail
    } = useWalletStore();
    const { priceResult } = useFetchCoinPrice();
    const isTrezor = walletType === WalletType.Trezor;

    const { list: addressList } = useAddressBookContext();
    const { fiatCurrency } = useCurrencyStore();

    const assetsInfo = useObservable(inMemoryWallet.assetInfo$);
    const eraSummaries = useObservable(inMemoryWallet.eraSummaries$);

    const signatures =
      activityDetail?.status === ActivityStatus.AWAITING_COSIGNATURES
        ? activityDetail.activity.witness.signatures
        : undefined;
    const { sharedWalletKey, transactionCosigners, signPolicy } = useSharedWalletData('payment', signatures);

    const signed = transactionCosigners.filter((c) => c.signed);
    const unsigned = transactionCosigners.filter((c) => !c.signed);

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

    // Where do we get the deposit field? LW-1363
    return (
      <>
        {isSharedWallet && (
          <Flex flexDirection="column" gap="$8">
            <ActivityDetailHeader name={t('sharedWallets.transaction.summary.header')} description="" />
            <Transaction.HeaderDescription>
              {t('sharedWallets.transaction.summary.unsigned.description')}
            </Transaction.HeaderDescription>
          </Flex>
        )}
        <Box mt={isSharedWallet ? '$0' : '$8'}>
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
        </Box>
        {isSharedWallet && (
          <div>
            <SummaryExpander
              onClick={() => setIsCosignersOpen(!isCosignersOpen)}
              open={isCosignersOpen}
              title={t('sharedWallets.transaction.cosigners.title')}
            >
              <Box pb="$32">
                {signPolicy && <InfoBar signPolicy={signPolicy} />}
                {signed.length > 0 && (
                  <CosignersList
                    ownSharedKey={sharedWalletKey}
                    list={signed}
                    title={t('sharedWallets.transaction.cosignerList.title.signed')}
                  />
                )}
                {unsigned.length > 0 && (
                  <CosignersList
                    ownSharedKey={sharedWalletKey}
                    list={unsigned}
                    title={t('sharedWallets.transaction.cosignerList.title.unsigned')}
                  />
                )}
              </Box>
            </SummaryExpander>
          </div>
        )}
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
