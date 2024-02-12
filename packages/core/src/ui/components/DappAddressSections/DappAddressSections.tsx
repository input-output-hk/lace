/* eslint-disable sonarjs/no-identical-functions */
import React from 'react';
import { truncate } from '@lace/common';
import { Wallet } from '@lace/cardano';
import { Cardano, AssetInfoWithAmount } from '@cardano-sdk/core';
import { Typography } from 'antd';

import styles from './DappAddressSections.module.scss';
import { useTranslate } from '@src/ui/hooks';

import { TransactionAssets, SummaryExpander } from '@lace/ui';

export interface DappAddressSectionProps {
  groupedFromAddresses: {
    nfts: Array<AssetInfoWithAmount>;
    tokens: Array<AssetInfoWithAmount>;
    addresses: Array<Cardano.PaymentAddress>;
  };
  groupedToAddresses: {
    nfts: Array<AssetInfoWithAmount>;
    tokens: Array<AssetInfoWithAmount>;
    addresses: Array<Cardano.PaymentAddress>;
  };
  isToAddressesEnabled: boolean;
  isFromAddressesEnabled: boolean;
}

const charBeforeEllName = 9;
const charAfterEllName = 0;

const charBeforeEllMetadata = 6;
const charAfterEllMetadata = 0;

const displayGroupedNFTs = (nfts: AssetInfoWithAmount[]) =>
  nfts.map((nft: AssetInfoWithAmount, index: number) => (
    <TransactionAssets
      index={index}
      key={nft.assetInfo.fingerprint}
      imageSrc={nft.assetInfo.tokenMetadata.icon ?? undefined}
      balance={Wallet.util.lovelacesToAdaString(nft.amount.toString())}
      tokenName={truncate(nft.assetInfo.nftMetadata?.name, charBeforeEllName, charAfterEllName)}
      metadataHash={truncate(nft.assetInfo.nftMetadata?.name, charBeforeEllMetadata, charAfterEllMetadata)}
    />
  ));

const displayGroupedTokens = (tokens: AssetInfoWithAmount[]) =>
  tokens.map((token: AssetInfoWithAmount, index: number) => (
    <TransactionAssets
      index={index}
      key={token.assetInfo.fingerprint}
      imageSrc={token.assetInfo.tokenMetadata.icon ?? undefined}
      balance={Wallet.util.lovelacesToAdaString(token.amount.toString())}
      tokenName={truncate(token.assetInfo.tokenMetadata.name, charBeforeEllName, charAfterEllName)}
      metadataHash={truncate(token.assetInfo.assetId, charBeforeEllMetadata, charAfterEllMetadata)}
    />
  ));

const { Title, Text } = Typography;

const charBeforeEllipsisName = 8;
const charAfterEllipsisName = 8;

export const DappAddressSections = ({
  groupedFromAddresses,
  groupedToAddresses,
  isToAddressesEnabled,
  isFromAddressesEnabled
}: DappAddressSectionProps): React.ReactElement => {
  const { t } = useTranslate();

  return (
    <>
      <SummaryExpander title={t('package.core.dappTransaction.fromAddress')} disabled={!isFromAddressesEnabled}>
        <div className={styles.summaryContent}>
          {groupedFromAddresses.addresses.map((address) => (
            <div key={address} className={styles.address}>
              <Title level={5}>{t('package.core.dappTransaction.address')}</Title>
              <Text className={styles.addressInfo}>
                {truncate(address, charBeforeEllipsisName, charAfterEllipsisName)}
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
        </div>
      </SummaryExpander>

      <SummaryExpander title={t('package.core.dappTransaction.toAddress')} disabled={!isToAddressesEnabled}>
        <div>
          {groupedToAddresses.addresses.map((address) => (
            <div key={address} className={styles.address}>
              <Title level={5}>{t('package.core.dappTransaction.address')}</Title>
              <Text className={styles.addressInfo}>
                {truncate(address, charBeforeEllipsisName, charAfterEllipsisName)}
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
  );
};
