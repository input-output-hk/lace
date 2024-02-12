/* eslint-disable complexity */
import React from 'react';
import { ErrorPane, addEllipsis } from '@lace/common';
import { Wallet } from '@lace/cardano';
import { Cardano, TransactionSummaryInspection, TokenTransferValue, AssetInfoWithAmount } from '@cardano-sdk/core';
import { Typography } from 'antd';

import { DappInfoProps } from '../DappInfo';

import styles from './DappTransaction.module.scss';
import { useTranslate } from '@src/ui/hooks';

import { TransactionFee } from '@ui/components/ActivityDetail';
import { TransactionType, DappTransactionSummary, TransactionAssets, SummaryExpander, Card } from '@lace/ui';

export enum TxType {
  Send = 'Send',
  Mint = 'Mint',
  Burn = 'Burn'
}

type TransactionDetails = {
  type: 'Mint' | 'Send';
};

export interface DappTransactionProps {
  /** Transaction details such as type, amount, fee and address */
  transaction: TransactionDetails;
  txInspectionDetails: TransactionSummaryInspection;
  /** dApp information such as logo, name and url */
  dappInfo: Omit<DappInfoProps, 'className'>;
  /** Optional error message */
  errorMessage?: string;
  fiatCurrencyCode?: string;
  fiatCurrencyPrice?: number;
  coinSymbol?: string;
  /** tokens send to being sent to or from the user */
  fromAddress: Map<Cardano.PaymentAddress, TokenTransferValue>;
  toAddress: Map<Cardano.PaymentAddress, TokenTransferValue>;
  deposit?: string;
  returnedDeposit?: string;
}

const { Title, Text } = Typography;

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

const charBeforeEllName = 9;
const charAfterEllName = 0;

const charBeforeEllMetadata = 6;
const charAfterEllMetadata = 0;

const displayGroupedNFTs = (nfts: AssetInfoWithAmount[]) =>
  nfts.map((nft: AssetInfoWithAmount) => (
    <TransactionAssets
      key={nft.assetInfo.fingerprint}
      imageSrc={nft.assetInfo.tokenMetadata.icon ?? undefined}
      balance={Wallet.util.lovelacesToAdaString(nft.amount.toString())}
      tokenName={addEllipsis(nft.assetInfo.nftMetadata?.name, charBeforeEllName, charAfterEllName)}
      metadataHash={addEllipsis(nft.assetInfo.nftMetadata?.name, charBeforeEllMetadata, charAfterEllMetadata)}
    />
  ));

const displayGroupedTokens = (tokens: AssetInfoWithAmount[]) =>
  tokens.map((token: AssetInfoWithAmount) => (
    <TransactionAssets
      key={token.assetInfo.fingerprint}
      imageSrc={token.assetInfo.tokenMetadata.icon ?? undefined}
      balance={Wallet.util.lovelacesToAdaString(token.amount.toString())}
      tokenName={addEllipsis(token.assetInfo.tokenMetadata.name, charBeforeEllName, charAfterEllName)}
      metadataHash={addEllipsis(token.assetInfo.assetId, charBeforeEllMetadata, charAfterEllMetadata)}
    />
  ));

const tokenName = (assetWithAmount: AssetInfoWithAmount) =>
  assetWithAmount.assetInfo.nftMetadata !== null
    ? assetWithAmount.assetInfo.nftMetadata.name
    : assetWithAmount.assetInfo.tokenMetadata.name;

const hash = (assetWithAmount: AssetInfoWithAmount) =>
  assetWithAmount.assetInfo.nftMetadata !== null ? assetWithAmount.assetInfo.nftMetadata.name : assetWithAmount.assetId;

const charBeforeEllipsisName = 8;
const charAfterEllipsisName = 8;

export const DappTransaction = ({
  transaction: { type },
  txInspectionDetails: { assets, coins, fee },
  toAddress,
  fromAddress,
  errorMessage,
  fiatCurrencyCode,
  fiatCurrencyPrice,
  coinSymbol,
  dappInfo,
  deposit,
  returnedDeposit
}: DappTransactionProps): React.ReactElement => {
  const { t } = useTranslate();

  const totalAmount = Wallet.util.lovelacesToAdaString(coins.toString());
  const txFee = Wallet.util.lovelacesToAdaString(fee.toString());

  const groupedToAddresses = groupAddresses(toAddress);
  const groupedFromAddresses = groupAddresses(fromAddress);

  const isFromAddressesEnabled = groupedFromAddresses.tokens.length > 0 || groupedFromAddresses.nfts.length > 0;
  const isToAddressesEnabled = groupedToAddresses.tokens.length > 0 || groupedToAddresses.nfts.length > 0;

  return (
    <div>
      {errorMessage && <ErrorPane error={errorMessage} className={styles.error} />}
      <div data-testid="dapp-transaction-container" className={styles.details}>
        <>
          <TransactionType
            label={t('package.core.dappTransaction.transaction')}
            transactionType={type}
            data-testid="transaction-type-container"
          />
          <SummaryExpander title={t('package.core.dappTransaction.origin')}>
            <Card.Outlined className={styles.dappInfoContainer}>
              <Text className={styles.dappInfo}>{dappInfo.name}</Text>
            </Card.Outlined>
          </SummaryExpander>
          <DappTransactionSummary
            title={t('package.core.dappTransaction.transactionSummary')}
            cardanoSymbol={coinSymbol}
            transactionAmount={totalAmount}
          />
          {[...assets].map(([key, assetWithAmount]: [string, AssetInfoWithAmount]) => (
            <TransactionAssets
              key={key}
              imageSrc={assetWithAmount.assetInfo.tokenMetadata.icon}
              balance={Wallet.util.lovelacesToAdaString(assetWithAmount.amount.toString())}
              tokenName={tokenName(assetWithAmount)}
              metadataHash={hash(assetWithAmount)}
            />
          ))}

          {returnedDeposit && (
            <TransactionFee
              fee={returnedDeposit}
              amountTransformer={(ada: string) =>
                `${Wallet.util.convertAdaToFiat({ ada, fiat: fiatCurrencyPrice })} ${fiatCurrencyCode}`
              }
              coinSymbol={coinSymbol}
            />
          )}

          {deposit && (
            <TransactionFee
              fee={deposit}
              amountTransformer={(ada: string) =>
                `${Wallet.util.convertAdaToFiat({ ada, fiat: fiatCurrencyPrice })} ${fiatCurrencyCode}`
              }
              coinSymbol={coinSymbol}
            />
          )}

          {txFee && txFee !== '-' && (
            <TransactionFee
              fee={txFee}
              amountTransformer={(ada: string) =>
                `${Wallet.util.convertAdaToFiat({ ada, fiat: fiatCurrencyPrice })} ${fiatCurrencyCode}`
              }
              coinSymbol={coinSymbol}
            />
          )}

          <SummaryExpander title={t('package.core.dappTransaction.fromAddress')} disabled={!isFromAddressesEnabled}>
            {groupedFromAddresses.addresses.map((address) => (
              <div key={address} className={styles.address}>
                <Title level={5}>{t('package.core.dappTransaction.address')}</Title>
                <Text className={styles.addressInfo}>
                  {addEllipsis(address, charBeforeEllipsisName, charAfterEllipsisName)}
                </Text>
              </div>
            ))}
            {groupedFromAddresses.tokens.length > 0 && (
              <>
                <Title level={5}>{t('package.core.dappTransaction.tokens')}</Title>
                {displayGroupedTokens(groupedFromAddresses.tokens)}
              </>
            )}
            {groupedFromAddresses.nfts.length > 0 && (
              <>
                <Title level={5}>{t('package.core.dappTransaction.nfts')}</Title>
                {displayGroupedNFTs(groupedFromAddresses.nfts)}
              </>
            )}
          </SummaryExpander>

          <SummaryExpander title={t('package.core.dappTransaction.toAddress')} disabled={!isToAddressesEnabled}>
            <div>
              {groupedToAddresses.addresses.map((address) => (
                <div key={address} className={styles.address}>
                  <Title level={5}>{t('package.core.dappTransaction.address')}</Title>
                  <Text className={styles.addressInfo}>
                    {addEllipsis(address, charBeforeEllipsisName, charAfterEllipsisName)}
                  </Text>
                </div>
              ))}
            </div>
            {groupedToAddresses.tokens.length > 0 && (
              <>
                <Title level={5}>{t('package.core.dappTransaction.tokens')}</Title>
                {displayGroupedTokens(groupedToAddresses.tokens)}
              </>
            )}
            {groupedToAddresses.nfts.length > 0 && (
              <>
                <Title level={5}>{t('package.core.dappTransaction.nfts')}</Title>
                {displayGroupedNFTs(groupedToAddresses.nfts)}
              </>
            )}
          </SummaryExpander>
        </>
      </div>
    </div>
  );
};
