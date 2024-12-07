/* eslint-disable sonarjs/no-identical-functions */
import React from 'react';
import { Cardano, AssetInfoWithAmount } from '@cardano-sdk/core';

import { DappAddressSection } from './DappAddressSection';
import { useTranslation } from 'react-i18next';

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
  coinSymbol?: string;
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
  const { t } = useTranslation();

  return (
    <>
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
    </>
  );
};
