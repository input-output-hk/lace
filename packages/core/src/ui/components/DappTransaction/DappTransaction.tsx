import React from 'react';
import { ErrorPane, truncate } from '@lace/common';
import { Wallet } from '@lace/cardano';

import { Cardano, TransactionSummaryInspection, TokenTransferValue, AssetInfoWithAmount } from '@cardano-sdk/core';

import { DappTransactionHeader, DappTransactionHeaderProps, TransactionTypes } from '../DappTransactionHeader';

import styles from './DappTransaction.module.scss';
import { useTranslate } from '@src/ui/hooks';
import { TransactionFee, Collateral } from '@ui/components/ActivityDetail';

import {
  TransactionType,
  DappTransactionSummary,
  TransactionAssets,
  DappTransactionTextField,
  Flex,
  Text,
  Box,
  Divider
} from '@lace/ui';
import { DappAddressSections } from '../DappAddressSections/DappAddressSections';

const amountTransformer = (fiat: { price: number; code: string }) => (ada: string) =>
  `${Wallet.util.convertAdaToFiat({ ada, fiat: fiat.price })} ${fiat.code}`;

export interface DappTransactionProps {
  /** Transaction details such as type, amount, fee and address */
  txInspectionDetails: TransactionSummaryInspection;
  /** dApp information such as logo, name and url */
  dappInfo: Omit<DappTransactionHeaderProps, 'className'>;
  /** Optional error message */
  errorMessage?: string;
  fiatCurrencyCode?: string;
  fiatCurrencyPrice?: number;
  coinSymbol?: string;
  expiresBy?: { utcDate: string; utcTime: string };
  /** tokens send to being sent to or from the user */
  fromAddress: Map<Cardano.PaymentAddress, TokenTransferValue>;
  toAddress: Map<Cardano.PaymentAddress, TokenTransferValue>;
  ownAddresses?: string[];
  addressToNameMap?: Map<string, string>;
  collateral?: bigint;
}

const isNFT = (asset: AssetInfoWithAmount) => asset.assetInfo.supply === BigInt(1);

interface GroupedAddressAssets {
  nfts: Array<AssetInfoWithAmount>;
  tokens: Array<AssetInfoWithAmount>;
  coins: Array<bigint>;
}

const groupAddresses = (addresses: Map<Cardano.PaymentAddress, TokenTransferValue>) => {
  const groupedAddresses: Map<Cardano.PaymentAddress, GroupedAddressAssets> = new Map();

  for (const [address, value] of addresses) {
    const group: GroupedAddressAssets = {
      coins: [],
      nfts: [],
      tokens: []
    };

    if (value.coins !== BigInt(0)) {
      group.coins.push(value.coins);
    }

    const addressAssets = value.assets;
    for (const [, asset] of addressAssets) {
      // NFTs are unique, so there is only a supply of 1
      if (asset.assetInfo.supply === BigInt(1)) {
        group.nfts.push(asset);
      } else {
        group.tokens.push(asset);
      }
    }

    if (group.coins.length > 0 || group.nfts.length > 0 || group.tokens.length > 0) {
      groupedAddresses.set(address, group);
    }
  }

  return groupedAddresses;
};

type TransactionType = keyof typeof TransactionTypes;

const tryDecodeAsUtf8 = (
  value: WithImplicitCoercion<string> | { [Symbol.toPrimitive](hint: 'string'): string }
): string => {
  const bytes = Uint8Array.from(Buffer.from(value, 'hex'));
  const decoder = new TextDecoder('utf-8');
  // Decode the Uint8Array to a UTF-8 string
  return decoder.decode(bytes);
};

const getFallbackName = (asset: AssetInfoWithAmount) =>
  tryDecodeAsUtf8(asset.assetInfo.name) ? tryDecodeAsUtf8(asset.assetInfo.name) : asset.assetInfo.assetId;

const getAssetTokenName = (assetWithAmount: AssetInfoWithAmount) => {
  if (isNFT(assetWithAmount)) {
    return assetWithAmount.assetInfo.nftMetadata?.name ?? getFallbackName(assetWithAmount);
  }
  return assetWithAmount.assetInfo.tokenMetadata?.ticker ?? getFallbackName(assetWithAmount);
};

const getTxType = (coins: bigint): TransactionType => {
  const balance = Wallet.util.lovelacesToAdaString(coins.toString());
  return balance.includes('-') === true ? 'Send' : 'Receive';
};

const charBeforeEllName = 9;
const charAfterEllName = 0;

export const DappTransaction = ({
  txInspectionDetails: { assets, coins, fee, deposit, returnedDeposit },
  toAddress,
  fromAddress,
  collateral,
  errorMessage,
  fiatCurrencyCode,
  fiatCurrencyPrice,
  coinSymbol,
  dappInfo,
  expiresBy,
  ownAddresses = [],
  addressToNameMap = new Map()
}: DappTransactionProps): React.ReactElement => {
  const { t } = useTranslate();

  const groupedToAddresses = groupAddresses(toAddress);
  const groupedFromAddresses = groupAddresses(fromAddress);

  const isFromAddressesEnabled = groupedFromAddresses.size > 0;
  const isToAddressesEnabled = groupedToAddresses.size > 0;

  const expireByText = expiresBy ? (
    <Flex flexDirection="column" alignItems="flex-end">
      <span>{expiresBy.utcDate}</span>
      <span>
        {expiresBy.utcTime} {t('core.outputSummaryList.utc')}
      </span>
    </Flex>
  ) : (
    t('core.outputSummaryList.noLimit')
  );

  return (
    <div>
      {errorMessage && <ErrorPane error={errorMessage} className={styles.error} />}
      <div data-testid="dapp-transaction-container" className={styles.details}>
        <DappTransactionHeader transactionType={getTxType(coins)} name={dappInfo.name} />
        <DappTransactionSummary
          testId="dapp-transaction-summary-row"
          title={t('core.dappTransaction.transactionSummary')}
          adaTooltip={t('core.dappTransaction.adaTooltip')}
          cardanoSymbol={coinSymbol}
          transactionAmount={Wallet.util.lovelacesToAdaString(coins.toString())}
          tooltip={t('core.dappTransaction.transactionSummaryTooltip')}
        />
        <div className={styles.transactionAssetsContainer}>
          {[...assets].map(([key, assetWithAmount]: [string, AssetInfoWithAmount]) => {
            const imageSrc =
              assetWithAmount.assetInfo.tokenMetadata?.icon ??
              assetWithAmount.assetInfo.nftMetadata?.image ??
              undefined;
            return (
              <TransactionAssets
                testId="dapp-transaction-summary-row"
                key={key}
                imageSrc={imageSrc}
                translations={{
                  assetId: t('core.dappTransaction.assetId'),
                  policyId: t('core.dappTransaction.policyId')
                }}
                balance={Wallet.util.calculateAssetBalance(assetWithAmount.amount, assetWithAmount.assetInfo)}
                assetId={assetWithAmount.assetInfo.assetId}
                policyId={assetWithAmount.assetInfo.policyId}
                tokenName={truncate(getAssetTokenName(assetWithAmount) ?? '', charBeforeEllName, charAfterEllName)}
                showImageBackground={imageSrc === undefined}
              />
            );
          })}
        </div>

        <Box mb="$20">
          <Divider />
        </Box>

        <Box mb="$16">
          <Text.Body.Normal weight="$semibold">{t('core.dappTransaction.additionalInformation')}</Text.Body.Normal>
        </Box>

        {collateral !== undefined && collateral !== BigInt(0) && (
          <Collateral
            testId="collateral"
            collateral={Wallet.util.lovelacesToAdaString(collateral.toString())}
            amountTransformer={amountTransformer({
              price: fiatCurrencyPrice,
              code: fiatCurrencyCode
            })}
            coinSymbol={coinSymbol}
            className={styles.depositContainer}
            displayFiat={false}
          />
        )}

        <div className={styles.depositContainer}>
          <DappTransactionTextField
            text={expireByText}
            label={t('core.outputSummaryList.expiresBy')}
            tooltip={t('core.outputSummaryList.expiresByTooltip')}
          />
        </div>

        {returnedDeposit !== BigInt(0) && (
          <TransactionFee
            fee={Wallet.util.lovelacesToAdaString(returnedDeposit.toString())}
            testId="returned-deposit"
            label={t('core.dappTransaction.returnedDeposit')}
            coinSymbol={coinSymbol}
            className={styles.depositContainer}
            displayFiat={false}
            amountTransformer={() =>
              `${Wallet.util.lovelacesToAdaString(returnedDeposit.toString())} ${fiatCurrencyCode}`
            }
          />
        )}

        {deposit !== BigInt(0) && (
          <TransactionFee
            testId="deposit"
            fee={Wallet.util.lovelacesToAdaString(deposit.toString())}
            label={t('core.dappTransaction.deposit')}
            coinSymbol={coinSymbol}
            className={styles.depositContainer}
            displayFiat={false}
            amountTransformer={() => `${Wallet.util.lovelacesToAdaString(deposit.toString())} ${fiatCurrencyCode}`}
          />
        )}

        <TransactionFee
          testId="fee"
          fee={Wallet.util.lovelacesToAdaString(fee.toString())}
          amountTransformer={() => `${Wallet.util.lovelacesToAdaString(fee.toString())} ${fiatCurrencyCode}`}
          coinSymbol={coinSymbol}
          className={styles.feeContainer}
          displayFiat={false}
        />

        <DappAddressSections
          isToAddressesEnabled={isToAddressesEnabled}
          isFromAddressesEnabled={isFromAddressesEnabled}
          groupedFromAddresses={groupedFromAddresses}
          groupedToAddresses={groupedToAddresses}
          coinSymbol={coinSymbol}
          ownAddresses={ownAddresses}
          addressToNameMap={addressToNameMap}
        />
      </div>
    </div>
  );
};
