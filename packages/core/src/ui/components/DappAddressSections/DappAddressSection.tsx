import React from 'react';
import { truncate, addEllipsis } from '@lace/common';
import { Wallet } from '@lace/cardano';
import { Cardano, AssetInfoWithAmount } from '@cardano-sdk/core';

import styles from './DappAddressSections.module.scss';
import { useTranslate } from '@src/ui/hooks';
import cn from 'classnames';

import { Text, TransactionAssets, DappTransactionSummary, Tooltip, SummaryExpander, Box, Flex } from '@lace/ui';
import { getAddressTagTranslations, renderAddressTag } from '@src/ui/utils';

interface GroupedAddressAssets {
  nfts: Array<AssetInfoWithAmount>;
  tokens: Array<AssetInfoWithAmount>;
  coins: Array<bigint>;
}

export interface DappAddressSectionProps {
  groupedAddresses: Map<Cardano.PaymentAddress, GroupedAddressAssets>;
  title: string;
  isEnabled: boolean;
  coinSymbol: string;
  addressType: 'from' | 'to';
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
export const DappAddressSection = ({
  groupedAddresses,
  isEnabled,
  coinSymbol,
  title,
  addressType,
  ownAddresses,
  addressToNameMap
}: DappAddressSectionProps): React.ReactElement => {
  const { t } = useTranslate();

  const itemsCountCopy = t('core.dappTransaction.items');

  return (
    <SummaryExpander title={title} disabled={!isEnabled} testId={`dapp-transaction-${addressType}-section-expander`}>
      {[...groupedAddresses.entries()].map(([address, addressData]) => (
        <Box mb="$20" key={address}>
          <div key={address} className={styles.address} data-testid={`dapp-transaction-${addressType}-row`}>
            <Text.Body.Normal data-testid="dapp-transaction-address-title" weight="$medium">
              {t('core.dappTransaction.address')}
            </Text.Body.Normal>

            <Flex flexDirection="column" alignItems="flex-end" gap="$8">
              <Text.Body.Small data-testid="dapp-transaction-address" weight="$medium">
                <Tooltip label={address}>
                  <span>{addEllipsis(address, charBeforeEllipsisName, charAfterEllipsisName)}</span>
                </Tooltip>
              </Text.Body.Small>
              {renderAddressTag(address, getAddressTagTranslations(t), ownAddresses, addressToNameMap)}
            </Flex>
          </div>
          {(addressData.tokens.length > 0 || addressData.coins.length > 0) && (
            <>
              <div className={styles.tokenCount} data-testid={`dapp-transaction-${addressType}-row`}>
                <Text.Body.Normal data-testid="dapp-transaction-tokens-title" weight="$medium">
                  {t('core.dappTransaction.tokens')}
                </Text.Body.Normal>
                <Text.Body.Normal
                  className={cn({ [styles.positiveAmount]: addressType === 'to' })}
                  data-testid="dapp-transaction-tokens-value"
                  weight="$medium"
                >
                  {addressType === 'to'
                    ? `${getTokenQuantity(addressData.tokens, addressData.coins)} ${itemsCountCopy}`
                    : `-${getTokenQuantity(addressData.tokens, addressData.coins)} ${itemsCountCopy}`}
                </Text.Body.Normal>
              </div>
              {addressData.coins.map((coin) => (
                <DappTransactionSummary
                  testId={`dapp-transaction-${addressType}-row`}
                  key={`${address}${coin}`}
                  cardanoSymbol={coinSymbol}
                  transactionAmount={getStringFromLovelace(coin)}
                />
              ))}
              {displayGroupedTokens(addressData.tokens, `dapp-transaction-${addressType}-row`)}
            </>
          )}

          {addressData.nfts.length > 0 && (
            <>
              <div className={styles.tokenCount} data-testid={`dapp-transaction-${addressType}-row`}>
                <Text.Body.Normal data-testid="dapp-transaction-nfts-title" weight="$medium">
                  {t('core.dappTransaction.nfts')}
                </Text.Body.Normal>
                <Text.Body.Normal
                  className={cn({ [styles.positiveAmount]: addressType === 'to' })}
                  data-testid="dapp-transaction-nfts-amount-value"
                  weight="$medium"
                >
                  {addressType === 'to'
                    ? `${addressData.nfts.length} ${itemsCountCopy}`
                    : `-${addressData.nfts.length} ${itemsCountCopy}`}
                </Text.Body.Normal>
              </div>
              {displayGroupedNFTs(addressData.nfts, `dapp-transaction-${addressType}-row`)}
            </>
          )}
        </Box>
      ))}
    </SummaryExpander>
  );
};
