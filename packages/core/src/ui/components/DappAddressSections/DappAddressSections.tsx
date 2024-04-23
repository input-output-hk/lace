/* eslint-disable sonarjs/no-identical-functions */
import React from 'react';
import { truncate, addEllipsis } from '@lace/common';
import { Wallet } from '@lace/cardano';
import { Cardano, AssetInfoWithAmount } from '@cardano-sdk/core';
import { Typography } from 'antd';

import styles from './DappAddressSections.module.scss';
import { useTranslate } from '@src/ui/hooks';

import { Flex, TransactionAssets, SummaryExpander, DappTransactionSummary, Tooltip } from '@lace/ui';
import classNames from 'classnames';
import { getAddressTagTranslations, renderAddressTag } from '@ui/utils/render-address-tag';

interface GroupedAddressAssets {
  nfts: Array<AssetInfoWithAmount>;
  tokens: Array<AssetInfoWithAmount>;
  coins: Array<bigint>;
}

export interface DappAddressSectionProps {
  groupedFromAddresses: Map<Cardano.PaymentAddress, GroupedAddressAssets>;
  groupedToAddresses: Map<Cardano.PaymentAddress, GroupedAddressAssets>;
  isToAddressesEnabled: boolean;
  isFromAddressesEnabled: boolean;
  coinSymbol: string;
  ownAddresses: string[];
  addressToNameMap?: Map<string, string>;
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

const displayGroupedNFTs = (nfts: AssetInfoWithAmount[], testId?: string) =>
  nfts.map((nft: AssetInfoWithAmount) => {
    const imageSrc = nft.assetInfo.tokenMetadata?.icon ?? nft.assetInfo.nftMetadata?.image ?? undefined;
    return (
      <TransactionAssets
        testId={testId}
        key={nft.assetInfo.fingerprint}
        imageSrc={imageSrc}
        balance={Wallet.util.calculateAssetBalance(nft.amount, nft.assetInfo)}
        tokenName={truncate(getAssetTokenName(nft), charBeforeEllName, charAfterEllName)}
        showImageBackground={imageSrc === undefined}
      />
    );
  });

const displayGroupedTokens = (tokens: AssetInfoWithAmount[], testId?: string) =>
  tokens.map((token: AssetInfoWithAmount) => {
    const imageSrc = token.assetInfo.tokenMetadata?.icon ?? token.assetInfo.nftMetadata?.image ?? undefined;

    return (
      <TransactionAssets
        testId={testId}
        key={token.assetInfo.fingerprint}
        imageSrc={token.assetInfo.tokenMetadata?.icon ?? token.assetInfo.nftMetadata?.image ?? undefined}
        balance={Wallet.util.calculateAssetBalance(token.amount, token.assetInfo)}
        tokenName={truncate(getAssetTokenName(token), charBeforeEllName, charAfterEllName)}
        showImageBackground={imageSrc === undefined}
      />
    );
  });

const { Title, Text } = Typography;

const charBeforeEllipsisName = 8;
const charAfterEllipsisName = 8;

const getStringFromLovelace = (value: bigint): string => Wallet.util.lovelacesToAdaString(value.toString());

const getTokenQuantity = (tokens: Array<AssetInfoWithAmount>, coins: Array<bigint>) => {
  let quantity = tokens.length;

  if (coins.length > 0) {
    quantity += 1;
  }

  return quantity;
};
export const DappAddressSections = ({
  groupedFromAddresses,
  groupedToAddresses,
  isToAddressesEnabled,
  isFromAddressesEnabled,
  coinSymbol,
  ownAddresses,
  addressToNameMap
}: DappAddressSectionProps): React.ReactElement => {
  const { t } = useTranslate();

  const itemsCountCopy = t('core.dappTransaction.items');

  return (
    <>
      <SummaryExpander
        title={t('core.dappTransaction.fromAddress')}
        disabled={!isFromAddressesEnabled}
        testId="dapp-transaction-from-section-expander"
      >
        <div className={styles.summaryContent}>
          {[...groupedFromAddresses.entries()].map(([address, addressData]) => (
            <>
              <div key={address} className={styles.address} data-testid="dapp-transaction-from-row">
                <Text className={styles.label} data-testid="dapp-transaction-address-title">
                  {t('core.dappTransaction.address')}
                </Text>
                <Flex flexDirection="column" alignItems="flex-end" gap="$8">
                  <Text className={styles.value} data-testid="dapp-transaction-address">
                    <Tooltip label={address}>
                      <span>{addEllipsis(address, charBeforeEllipsisName, charAfterEllipsisName)}</span>
                    </Tooltip>
                  </Text>
                  {renderAddressTag(address, getAddressTagTranslations(t), ownAddresses, addressToNameMap)}
                </Flex>
              </div>
              {(addressData.tokens.length > 0 || addressData.coins.length > 0) && (
                <>
                  <div className={styles.tokenCount} data-testid="dapp-transaction-from-row">
                    <Title level={5} className={styles.label} data-testid="dapp-transaction-tokens-title">
                      {t('core.dappTransaction.tokens')}
                    </Title>
                    <Title level={5} className={styles.value} data-testid="dapp-transaction-tokens-value">
                      -{getTokenQuantity(addressData.tokens, addressData.coins)} {itemsCountCopy}
                    </Title>
                  </div>
                  {addressData.coins.map((coin) => (
                    <DappTransactionSummary
                      testId="dapp-transaction-from-row"
                      key={`${address}${coin}`}
                      cardanoSymbol={coinSymbol}
                      transactionAmount={getStringFromLovelace(coin)}
                    />
                  ))}
                  {displayGroupedTokens(addressData.tokens, 'dapp-transaction-from-row')}
                </>
              )}

              {addressData.nfts.length > 0 && (
                <>
                  <div className={styles.tokenCount} data-testid="dapp-transaction-from-row">
                    <Title level={5} data-testid="dapp-transaction-nfts-title">
                      {t('core.dappTransaction.nfts')}
                    </Title>
                    <Title level={5} data-testid="dapp-transaction-nfts-amount-value">
                      -{addressData.nfts.length} {itemsCountCopy}
                    </Title>
                  </div>
                  {displayGroupedNFTs(addressData.nfts, 'dapp-transaction-from-row')}
                </>
              )}
            </>
          ))}
        </div>
      </SummaryExpander>

      <SummaryExpander
        title={t('core.dappTransaction.toAddress')}
        disabled={!isToAddressesEnabled}
        testId="dapp-transaction-to-section-expander"
      >
        <div>
          {[...groupedToAddresses.entries()].map(([address, addressData]) => (
            <>
              <div key={address} className={styles.address} data-testid="dapp-transaction-to-row">
                <Text className={styles.label} data-testid="dapp-transaction-address-title">
                  {t('core.dappTransaction.address')}
                </Text>
                <Flex flexDirection="column" alignItems="flex-end" gap="$8">
                  <Text className={styles.value} data-testid="dapp-transaction-address">
                    <Tooltip label={address}>
                      <span>{addEllipsis(address, charBeforeEllipsisName, charAfterEllipsisName)}</span>
                    </Tooltip>
                  </Text>
                  {renderAddressTag(address, getAddressTagTranslations(t), ownAddresses, addressToNameMap)}
                </Flex>
              </div>
              {(addressData.tokens.length > 0 || addressData.coins.length > 0) && (
                <>
                  <div className={styles.tokenCount} data-testid="dapp-transaction-to-row">
                    <Title level={5} className={styles.label} data-testid="dapp-transaction-tokens-title">
                      {t('core.dappTransaction.tokens')}
                    </Title>
                    <Title
                      level={5}
                      className={classNames(styles.value, styles.positiveAmount)}
                      data-testid="dapp-transaction-tokens-value"
                    >
                      {getTokenQuantity(addressData.tokens, addressData.coins)} {itemsCountCopy}
                    </Title>
                  </div>
                  {addressData.coins.map((coin) => (
                    <DappTransactionSummary
                      key={`${address}${coin}`}
                      cardanoSymbol={coinSymbol}
                      transactionAmount={getStringFromLovelace(coin)}
                      testId="dapp-transaction-to-row"
                    />
                  ))}
                  {displayGroupedTokens(addressData.tokens, 'dapp-transaction-to-row')}
                </>
              )}

              {addressData.nfts.length > 0 && (
                <>
                  <div className={styles.tokenCount} data-testid="dapp-transaction-to-row">
                    <Title level={5} className={styles.label} data-testid="dapp-transaction-nfts-title">
                      {t('core.dappTransaction.nfts')}
                    </Title>
                    <Title
                      level={5}
                      className={classNames(styles.value, styles.positiveAmount)}
                      data-testid="dapp-transaction-nfts-amount-value"
                    >
                      {addressData.nfts.length} {itemsCountCopy}
                    </Title>
                  </div>
                  {displayGroupedNFTs(addressData.nfts, 'dapp-transaction-to-row')}
                </>
              )}
            </>
          ))}
        </div>
      </SummaryExpander>
    </>
  );
};
