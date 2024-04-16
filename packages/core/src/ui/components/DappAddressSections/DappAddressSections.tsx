/* eslint-disable sonarjs/no-identical-functions */
import React from 'react';
import { Cardano, AssetInfoWithAmount } from '@cardano-sdk/core';

import styles from './DappAddressSections.module.scss';
import { useTranslate } from '@src/ui/hooks';

import { DappAddressSection } from './DappAddressSection';

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

  return (
    <div className={styles.root}>
      <DappAddressSection
        addressType="from"
        coinSymbol={coinSymbol}
        groupedAddresses={groupedFromAddresses}
        title={t('core.dappTransaction.fromAddress')}
        isEnabled={isFromAddressesEnabled}
        ownAddresses={ownAddresses}
        addressToNameMap={addressToNameMap}
      />

      <DappAddressSection
        addressType="to"
        coinSymbol={coinSymbol}
        groupedAddresses={groupedToAddresses}
        title={t('core.dappTransaction.toAddress')}
        isEnabled={isToAddressesEnabled}
        ownAddresses={ownAddresses}
        addressToNameMap={addressToNameMap}
      />
    </div>
  );
};
