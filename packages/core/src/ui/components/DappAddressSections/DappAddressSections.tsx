/* eslint-disable sonarjs/no-identical-functions */
import React from 'react';
import { truncate, addEllipsis } from '@lace/common';
import { Wallet } from '@lace/cardano';
import { Cardano, AssetInfoWithAmount } from '@cardano-sdk/core';
import { Typography } from 'antd';

import styles from './DappAddressSections.module.scss';
import { useTranslate } from '@src/ui/hooks';

import { TransactionAssets, SummaryExpander, DappTransactionSummary } from '@lace/ui';

export interface DappAddressSectionProps {
  groupedFromAddresses: {
    nfts: Array<AssetInfoWithAmount>;
    tokens: Array<AssetInfoWithAmount>;
    addresses: Array<Cardano.PaymentAddress>;
    coins: Array<bigint>;
  };
  groupedToAddresses: {
    nfts: Array<AssetInfoWithAmount>;
    tokens: Array<AssetInfoWithAmount>;
    addresses: Array<Cardano.PaymentAddress>;
    coins: Array<bigint>;
  };
  isToAddressesEnabled: boolean;
  isFromAddressesEnabled: boolean;
  coinSymbol: string;
}

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

const isNFT = (asset: AssetInfoWithAmount) => asset.assetInfo.supply === BigInt(1);

const getAssetTokenName = (assetWithAmount: AssetInfoWithAmount) => {
  if (isNFT(assetWithAmount)) {
    return assetWithAmount.assetInfo.nftMetadata?.name ?? getFallbackName(assetWithAmount);
  }
  return assetWithAmount.assetInfo.tokenMetadata?.ticker ?? getFallbackName(assetWithAmount);
};

const charBeforeEllName = 9;
const charAfterEllName = 0;

const displayGroupedNFTs = (nfts: AssetInfoWithAmount[]) =>
  nfts.map((nft: AssetInfoWithAmount) => (
    <TransactionAssets
      testId="dapp-transaction-nfts-container"
      key={nft.assetInfo.fingerprint}
      imageSrc={nft.assetInfo.tokenMetadata?.icon ?? undefined}
      balance={Wallet.util.calculateAssetBalance(nft.amount, nft.assetInfo)}
      tokenName={truncate(getAssetTokenName(nft), charBeforeEllName, charAfterEllName)}
    />
  ));

const displayGroupedTokens = (tokens: AssetInfoWithAmount[]) =>
  tokens.map((token: AssetInfoWithAmount) => (
    <TransactionAssets
      testId="dapp-transaction-token-container"
      key={token.assetInfo.fingerprint}
      imageSrc={token.assetInfo.tokenMetadata?.icon ?? undefined}
      balance={Wallet.util.calculateAssetBalance(token.amount, token.assetInfo)}
      tokenName={truncate(getAssetTokenName(token), charBeforeEllName, charAfterEllName)}
    />
  ));

const { Title, Text } = Typography;

const charBeforeEllipsisName = 8;
const charAfterEllipsisName = 8;

const getStringFromLovelace = (value: bigint): string => Wallet.util.lovelacesToAdaString(value.toString());

export const DappAddressSections = ({
  groupedFromAddresses,
  groupedToAddresses,
  isToAddressesEnabled,
  isFromAddressesEnabled,
  coinSymbol
}: DappAddressSectionProps): React.ReactElement => {
  const { t } = useTranslate();

  const itemsCountCopy = t('package.core.dappTransaction.items');

  return (
    <>
      <SummaryExpander title={t('package.core.dappTransaction.fromAddress')} disabled={!isFromAddressesEnabled}>
        <div className={styles.summaryContent}>
          {groupedFromAddresses.addresses.map((address) => (
            <div key={address} className={styles.address}>
              <Text className={styles.addressInfo} data-testId="dapp-transaction-from-address-title">
                {t('package.core.dappTransaction.address')}
              </Text>
              <Text className={styles.addressInfo} data-testid="dapp-transaction-from-address-address">
                {addEllipsis(address, charBeforeEllipsisName, charAfterEllipsisName)}
              </Text>
            </div>
          ))}

          {groupedFromAddresses.tokens.length > 0 ||
            (groupedFromAddresses.coins.length > 0 && (
              <>
                <div className={styles.tokenCount}>
                  <Title level={5} data-testid="dapp-transaction-tokens-title">
                    {t('package.core.dappTransaction.tokens')}
                  </Title>
                  <Title level={5}>
                    -{groupedFromAddresses.tokens.length} {itemsCountCopy}
                  </Title>
                </div>
                {groupedFromAddresses.coins.map((coin) => (
                  <DappTransactionSummary
                    key={groupedFromAddresses.addresses[0]}
                    cardanoSymbol={coinSymbol}
                    transactionAmount={getStringFromLovelace(coin)}
                  />
                ))}
                {displayGroupedTokens(groupedFromAddresses.tokens)}
              </>
            ))}
          {groupedFromAddresses.nfts.length > 0 && (
            <>
              <div className={styles.tokenCount}>
                <Title level={5} data-testid="dapp-transaction-nfts-title">
                  {t('package.core.dappTransaction.nfts')}
                </Title>
                <Title level={5}>
                  -{groupedFromAddresses.nfts.length} {itemsCountCopy}
                </Title>
              </div>
              {displayGroupedNFTs(groupedFromAddresses.nfts)}
            </>
          )}
        </div>
      </SummaryExpander>

      <SummaryExpander title={t('package.core.dappTransaction.toAddress')} disabled={!isToAddressesEnabled}>
        <div>
          {groupedToAddresses.addresses.map((address) => (
            <div key={address} className={styles.address}>
              <Text className={styles.addressInfo} data-testid="dapp-transaction-to-address-title">
                {t('package.core.dappTransaction.address')}
              </Text>
              <Text className={styles.addressInfo} data-testid="dapp-transaction-to-address">
                {addEllipsis(address, charBeforeEllipsisName, charAfterEllipsisName)}
              </Text>
            </div>
          ))}
        </div>
        {groupedToAddresses.tokens.length > 0 ||
          (groupedToAddresses.coins.length > 0 && (
            <>
              <div className={styles.tokenCount}>
                <Title level={5} data-testid="dapp-transaction-tokens-title">
                  {t('package.core.dappTransaction.tokens')}
                </Title>
                <Title level={5}>
                  +{groupedToAddresses.tokens.length} {itemsCountCopy}
                </Title>
              </div>
              {groupedToAddresses.coins.map((coin) => (
                <DappTransactionSummary
                  key={groupedFromAddresses.addresses[0]}
                  cardanoSymbol={coinSymbol}
                  transactionAmount={`+${getStringFromLovelace(coin)}`}
                />
              ))}
              {displayGroupedTokens(groupedToAddresses.tokens)}
            </>
          ))}
        {groupedToAddresses.nfts.length > 0 && (
          <>
            <div className={styles.tokenCount}>
              <Title level={5} data-testid="dapp-transaction-nfts-title">
                {t('package.core.dappTransaction.nfts')}
              </Title>
              <Title level={5}>
                +{groupedToAddresses.nfts.length} {itemsCountCopy}
              </Title>
            </div>
            {displayGroupedNFTs(groupedToAddresses.nfts)}
          </>
        )}
      </SummaryExpander>
    </>
  );
};
