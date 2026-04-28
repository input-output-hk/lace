import { useTranslation } from '@lace-contract/i18n';
import { Column, CustomTag, Divider, spacing } from '@lace-lib/ui-toolkit';
import React, { useMemo } from 'react';

import {
  formatAssetAmount,
  getAssetDisplayInfo,
  getNftItemCount,
  getTokenItemCount,
  groupAddressesByAssetType,
  truncateHash,
  type TokensMetadataMap,
  type GroupedAddressAssets,
} from '../../utils';
import { calculateAdaFiatValue } from '../../utils/sign-tx-utils';
import { formatLovelaceToAda } from '../../utils/transaction-inspector';

import { CollapsibleSection } from './CollapsibleSection';
import { InfoRow } from './InfoRow';
import { TokenAmount } from './TokenAmount';

import type { TokenTransferValue } from '../../hooks';
import type { Cardano } from '@cardano-sdk/core';
import type { TFunction } from '@lace-contract/i18n';
import type { TokenPrice, TokenPriceId } from '@lace-contract/token-pricing';

interface AddressEntry {
  address: Cardano.PaymentAddress;
  assets: TokenTransferValue;
  isOwn: boolean;
  contactName?: string;
}

export interface AddressesSectionProps {
  addresses: AddressEntry[];
  tokensMetadata?: TokensMetadataMap;
  coinSymbol: string;
  tokenPrices?: Record<TokenPriceId, TokenPrice>;
  currencyTicker?: string;
  variant: 'from' | 'to';
  testID?: string;
}

interface AddressContentProps {
  address: Cardano.PaymentAddress;
  groupedAssets: GroupedAddressAssets | undefined;
  isOwn: boolean;
  contactName?: string;
  coinSymbol: string;
  tokenPrices?: Record<TokenPriceId, TokenPrice>;
  currencyTicker?: string;
  variant: 'from' | 'to';
  testID?: string;
}

const formatItemCount = (
  count: number,
  isPositive: boolean,
  t: TFunction,
): string => {
  const sign = isPositive ? '+' : '-';
  const word =
    count === 1
      ? t('dapp-connector.cardano.sign-tx.item')
      : t('dapp-connector.cardano.sign-tx.items');
  return `${sign} ${count} ${word}`;
};

const AddressContent = ({
  address,
  groupedAssets,
  isOwn,
  contactName,
  coinSymbol,
  tokenPrices,
  currencyTicker,
  variant,
  testID,
}: AddressContentProps) => {
  const { t } = useTranslation();

  const truncatedAddress = useMemo(() => truncateHash(address), [address]);

  const hasCoins = groupedAssets && groupedAssets.coins.length > 0;
  const hasTokens = groupedAssets && groupedAssets.tokens.length > 0;
  const hasNfts = groupedAssets && groupedAssets.nfts.length > 0;
  const tokenItemCount = groupedAssets ? getTokenItemCount(groupedAssets) : 0;
  const nftItemCount = groupedAssets ? getNftItemCount(groupedAssets) : 0;

  const isPositive = variant === 'to';

  return (
    <>
      <InfoRow
        label={t('dapp-connector.cardano.sign-tx.address-label')}
        value={contactName ?? truncatedAddress}
        secondaryValue={
          isOwn ? (
            <CustomTag
              size="S"
              color="primary"
              backgroundType="semiTransparent"
              label={t('dapp-connector.cardano.sign-tx.address.own')}
              testID={testID ? `${testID}-address-own-tag` : undefined}
            />
          ) : undefined
        }
        testID={testID ? `${testID}-address-value` : undefined}
      />

      {groupedAssets && (hasCoins || hasTokens) && (
        <Column gap={spacing.L}>
          <InfoRow
            label={t('dapp-connector.cardano.sign-tx.tokens-label')}
            value={formatItemCount(tokenItemCount, isPositive, t)}
            testID={testID ? `${testID}-tokens-label` : undefined}
          />
          <Column gap={spacing.L}>
            {hasCoins &&
              groupedAssets.coins.map((coin: bigint, index: number) => (
                <InfoRow
                  key={`coin-${coin.toString()}-${index}`}
                  value={`${formatLovelaceToAda(coin)} ${coinSymbol}`}
                  secondaryValue={calculateAdaFiatValue(
                    coin,
                    tokenPrices,
                    currencyTicker,
                  )}
                  testID={testID ? `${testID}-coin-row-${index}` : undefined}
                />
              ))}
            {hasTokens &&
              groupedAssets.tokens.map((asset, index) => {
                const displayInfo = getAssetDisplayInfo(
                  asset.assetId,
                  asset.metadata,
                );
                const formattedAmount = formatAssetAmount(
                  asset.amount,
                  displayInfo.decimals,
                );
                return (
                  <InfoRow
                    key={`${asset.assetId}-${index}`}
                    value={
                      <TokenAmount
                        amount={formattedAmount}
                        symbol={displayInfo.ticker}
                        isPositive={isPositive}
                        imageUrl={displayInfo.image}
                        testID={
                          testID ? `${testID}-token-row-${index}` : undefined
                        }
                      />
                    }
                  />
                );
              })}
          </Column>
        </Column>
      )}

      {groupedAssets && hasNfts && (
        <Column gap={spacing.L}>
          <InfoRow
            label={t('dapp-connector.cardano.sign-tx.nfts-label')}
            value={formatItemCount(nftItemCount, isPositive, t)}
            testID={testID ? `${testID}-nfts-label` : undefined}
          />
          {groupedAssets.nfts.map((asset, index) => {
            const displayInfo = getAssetDisplayInfo(
              asset.assetId,
              asset.metadata,
            );
            const formattedAmount = formatAssetAmount(
              asset.amount,
              displayInfo.decimals,
            );
            return (
              <InfoRow
                key={`${asset.assetId}-${index}`}
                value={
                  <TokenAmount
                    amount={formattedAmount}
                    symbol={displayInfo.ticker}
                    isPositive={isPositive}
                    imageUrl={displayInfo.image}
                    testID={testID ? `${testID}-nft-row-${index}` : undefined}
                  />
                }
              />
            );
          })}
        </Column>
      )}
    </>
  );
};

export const AddressesSection = ({
  addresses,
  tokensMetadata,
  coinSymbol,
  tokenPrices,
  currencyTicker,
  variant,
  testID: testIDProperty,
}: AddressesSectionProps) => {
  const { t } = useTranslation();

  const testID = testIDProperty ?? `sign-tx-addresses-${variant}`;

  const groupedAssetsMap = useMemo(() => {
    const addressMap = new Map<Cardano.PaymentAddress, TokenTransferValue>();
    for (const entry of addresses) {
      addressMap.set(entry.address, entry.assets);
    }
    return groupAddressesByAssetType(addressMap, tokensMetadata);
  }, [addresses, tokensMetadata]);

  const sectionTitle = useMemo((): string => {
    return variant === 'from'
      ? t('dapp-connector.cardano.sign-tx.from-address-label')
      : t('dapp-connector.cardano.sign-tx.to-address-label');
  }, [variant, t]);

  const addressesWithAssets = useMemo(() => {
    return addresses.filter(entry => {
      const grouped = groupedAssetsMap.get(entry.address);
      if (!grouped) return false;
      return (
        grouped.coins.length > 0 ||
        grouped.tokens.length > 0 ||
        grouped.nfts.length > 0
      );
    });
  }, [addresses, groupedAssetsMap]);

  if (addressesWithAssets.length === 0) {
    return null;
  }

  return (
    <CollapsibleSection title={sectionTitle} testID={testID}>
      <Column gap={spacing.L}>
        {addressesWithAssets.map((entry, index) => (
          <Column
            gap={spacing.L}
            key={`address-${entry.address}`}
            testID={`${testID}-address-${index}`}>
            <AddressContent
              address={entry.address}
              groupedAssets={groupedAssetsMap.get(entry.address)}
              isOwn={entry.isOwn}
              contactName={entry.contactName}
              coinSymbol={coinSymbol}
              tokenPrices={tokenPrices}
              currencyTicker={currencyTicker}
              variant={variant}
              testID={`${testID}-address-${index}`}
            />
            {index < addressesWithAssets.length - 1 && <Divider />}
          </Column>
        ))}
      </Column>
    </CollapsibleSection>
  );
};
