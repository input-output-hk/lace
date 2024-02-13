import React from 'react';
import { ErrorPane, truncate } from '@lace/common';
import { Wallet } from '@lace/cardano';
import { Cardano, TransactionSummaryInspection, TokenTransferValue, AssetInfoWithAmount } from '@cardano-sdk/core';

import { DappTransactionHeader, DappTransactionHeaderProps } from '../DappTransactionHeader';

import styles from './DappTransaction.module.scss';
import { useTranslate } from '@src/ui/hooks';

import { TransactionFooterDetails } from '../ActivityDetail/TransactionFooterDetails';
import { TransactionType, DappTransactionSummary, TransactionAssets } from '@lace/ui';
import { DappAddressSections } from '../DappAddressSections/DappAddressSections';

const TransactionTypes = {
  Withdrawal: 'withdrawal' as const,
  Receive: 'receive' as const,
  Sent: 'outgoing' as const,
  Send: 'send' as const,
  Sending: 'sending' as const,
  Mint: 'mint' as const,
  'Self Transaction': 'self' as const
};

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
}

const groupAddresses = (addresses: Map<Cardano.PaymentAddress, TokenTransferValue>) => {
  const groupedAddresses: {
    nfts: Array<AssetInfoWithAmount>;
    tokens: Array<AssetInfoWithAmount>;
    addresses: Array<Cardano.PaymentAddress>;
  } = {
    nfts: [],
    tokens: [],
    addresses: []
  };

  for (const [address, value] of addresses) {
    const addressAssets = value.assets;
    groupedAddresses.addresses.push(address);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for (const [_, asset] of addressAssets) {
      if (asset.assetInfo.nftMetadata !== null) {
        groupedAddresses.nfts.push(asset);
      } else {
        groupedAddresses.tokens.push(asset);
      }
    }
  }

  return groupedAddresses;
};

type TransactionType = keyof typeof TransactionTypes;

const tokenName = (assetWithAmount: AssetInfoWithAmount) =>
  assetWithAmount.assetInfo.nftMetadata !== null
    ? assetWithAmount.assetInfo.nftMetadata.name
    : assetWithAmount.assetInfo.tokenMetadata.name;

const hash = (assetWithAmount: AssetInfoWithAmount) =>
  assetWithAmount.assetInfo.nftMetadata !== null
    ? assetWithAmount.assetInfo.nftMetadata.name
    : assetWithAmount.assetInfo.assetId;

const getStringFromLovelace = (value: bigint): string => Wallet.util.lovelacesToAdaString(value.toString());

const getTxType = (coins: bigint): TransactionType => {
  const balance = getStringFromLovelace(coins);
  return balance.includes('-') === true ? 'Send' : 'Receive';
};

const charBeforeEllName = 9;
const charAfterEllName = 0;

const charBeforeEllMetadata = 6;
const charAfterEllMetadata = 0;

export const DappTransaction = ({
  txInspectionDetails: { assets, coins, fee, deposit, returnedDeposit },
  toAddress,
  fromAddress,
  errorMessage,
  fiatCurrencyCode,
  fiatCurrencyPrice,
  coinSymbol,
  dappInfo
}: DappTransactionProps): React.ReactElement => {
  const { t } = useTranslate();

  const groupedToAddresses = groupAddresses(toAddress);
  const groupedFromAddresses = groupAddresses(fromAddress);

  const isFromAddressesEnabled = groupedFromAddresses.tokens.length > 0 || groupedFromAddresses.nfts.length > 0;
  const isToAddressesEnabled = groupedToAddresses.tokens.length > 0 || groupedToAddresses.nfts.length > 0;

  return (
    <div>
      {errorMessage && <ErrorPane error={errorMessage} className={styles.error} />}
      <div data-testid="dapp-transaction-container" className={styles.details}>
        <DappTransactionHeader transactionType={getTxType(coins)} name={dappInfo.name} />
        <DappTransactionSummary
          title={t('package.core.dappTransaction.transactionSummary')}
          cardanoSymbol={coinSymbol}
          transactionAmount={getStringFromLovelace(coins)}
        />
        <div className={styles.transactionAssetsContainer}>
          {[...assets].map(([key, assetWithAmount]: [string, AssetInfoWithAmount], index: number) => (
            <TransactionAssets
              index={index}
              key={key}
              imageSrc={assetWithAmount.assetInfo.tokenMetadata.icon}
              balance={Wallet.util.lovelacesToAdaString(assetWithAmount.amount.toString())}
              tokenName={truncate(tokenName(assetWithAmount), charBeforeEllName, charAfterEllName)}
              metadataHash={truncate(hash(assetWithAmount), charBeforeEllMetadata, charAfterEllMetadata)}
            />
          ))}
        </div>

        <TransactionFooterDetails
          fee={getStringFromLovelace(returnedDeposit)}
          title={t('package.core.dappTransaction.returnedDeposit')}
          amountTransformer={(ada: string) =>
            `${Wallet.util.convertAdaToFiat({ ada, fiat: fiatCurrencyPrice })} ${fiatCurrencyCode}`
          }
          coinSymbol={coinSymbol}
          displayTooltip={false}
          displayFiat={false}
          className={styles.despositContainer}
        />

        <TransactionFooterDetails
          displayTooltip={false}
          fee={getStringFromLovelace(deposit)}
          title={t('package.core.dappTransaction.deposit')}
          amountTransformer={(ada: string) =>
            `${Wallet.util.convertAdaToFiat({ ada, fiat: fiatCurrencyPrice })} ${fiatCurrencyCode}`
          }
          coinSymbol={coinSymbol}
          displayFiat={false}
          className={styles.depositContainer}
        />

        <TransactionFooterDetails
          displayTooltip={false}
          displayFiat={false}
          fee={getStringFromLovelace(fee)}
          amountTransformer={(ada: string) =>
            `${Wallet.util.convertAdaToFiat({ ada, fiat: fiatCurrencyPrice })} ${fiatCurrencyCode}`
          }
          coinSymbol={coinSymbol}
          className={styles.feeContainer}
        />

        <DappAddressSections
          isToAddressesEnabled={isToAddressesEnabled}
          isFromAddressesEnabled={isFromAddressesEnabled}
          groupedFromAddresses={groupedFromAddresses}
          groupedToAddresses={groupedToAddresses}
        />
      </div>
    </div>
  );
};
