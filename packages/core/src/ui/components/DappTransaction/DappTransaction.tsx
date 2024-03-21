/* eslint-disable no-console */
import React from 'react';
import { ErrorPane, truncate } from '@lace/common';
import { Wallet } from '@lace/cardano';

import { Cardano, TransactionSummaryInspection, TokenTransferValue, AssetInfoWithAmount } from '@cardano-sdk/core';

import { DappTransactionHeader, DappTransactionHeaderProps, TransactionTypes } from '../DappTransactionHeader';

import styles from './DappTransaction.module.scss';
import { useTranslate } from '@src/ui/hooks';
import { TransactionFee, Collateral } from '@ui/components/ActivityDetail';

import { TransactionType, DappTransactionSummary, TransactionAssets } from '@lace/ui';
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
  /** tokens send to being sent to or from the user */
  fromAddress: Map<Cardano.PaymentAddress, TokenTransferValue>;
  toAddress: Map<Cardano.PaymentAddress, TokenTransferValue>;
  collateral?: string;
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
  dappInfo
}: DappTransactionProps): React.ReactElement => {
  const { t } = useTranslate();

  const groupedToAddresses = groupAddresses(toAddress);
  const groupedFromAddresses = groupAddresses(fromAddress);

  const isFromAddressesEnabled = groupedFromAddresses.size > 0;
  const isToAddressesEnabled = groupedToAddresses.size > 0;

  return (
    <div>
      {errorMessage && <ErrorPane error={errorMessage} className={styles.error} />}
      <div data-testid="dapp-transaction-container" className={styles.details}>
        <DappTransactionHeader transactionType={getTxType(coins)} name={dappInfo.name} />
        <DappTransactionSummary
          title={t('package.core.dappTransaction.transactionSummary')}
          cardanoSymbol={coinSymbol}
          transactionAmount={Wallet.util.lovelacesToAdaString(coins.toString())}
        />
        <div className={styles.transactionAssetsContainer}>
          {[...assets].map(([key, assetWithAmount]: [string, AssetInfoWithAmount]) => {
            const imageSrc =
              assetWithAmount.assetInfo.tokenMetadata?.icon ??
              assetWithAmount.assetInfo.nftMetadata?.image ??
              undefined;
            return (
              <TransactionAssets
                testId="dapp-transaction-amount-value"
                key={key}
                imageSrc={imageSrc}
                balance={Wallet.util.calculateAssetBalance(assetWithAmount.amount, assetWithAmount.assetInfo)}
                tokenName={truncate(getAssetTokenName(assetWithAmount) ?? '', charBeforeEllName, charAfterEllName)}
                showImageBackground={imageSrc === undefined}
              />
            );
          })}
        </div>

        {collateral && (
          <Collateral
            collateral={collateral}
            amountTransformer={amountTransformer({
              price: fiatCurrencyPrice,
              code: fiatCurrencyCode
            })}
            coinSymbol={coinSymbol}
            className={styles.depositContainer}
            displayFiat={false}
          />
        )}

        {returnedDeposit !== BigInt(0) && (
          <TransactionFee
            fee={`+${Wallet.util.lovelacesToAdaString(returnedDeposit.toString())}`}
            testId="returned-deposit"
            label={t('package.core.dappTransaction.returnedDeposit')}
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
            fee={`-${Wallet.util.lovelacesToAdaString(deposit.toString())}`}
            label={t('package.core.dappTransaction.deposit')}
            coinSymbol={coinSymbol}
            className={styles.depositContainer}
            displayFiat={false}
            amountTransformer={() => `${Wallet.util.lovelacesToAdaString(deposit.toString())} ${fiatCurrencyCode}`}
          />
        )}

        <TransactionFee
          testId="fee"
          fee={`-${Wallet.util.lovelacesToAdaString(fee.toString())}`}
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
        />
      </div>
    </div>
  );
};
