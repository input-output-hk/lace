import { AssetInputList } from '@lace/core';
import { useCoinStateSelector } from '../../../store';
import { Wallet } from '@lace/cardano';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getTemporaryTxDataFromStorage } from '../../../helpers';
import { UseSelectedCoinsProps, useSelectedCoins } from './useSelectedCoins';
import { useRewardAccountsData } from '@src/views/browser-view/features/staking/hooks';
import { LockedStakeRewardsBanner } from '../LockedStakeRewardsBanner/LockedStakeRewardsBanner';

export type CoinInputProps = {
  bundleId: string;
  assetBalances: Wallet.Cardano.Value['assets'];
  canAddMoreAssets?: boolean;
  onAddAsset?: () => void;
  spendableCoin: bigint;
  isPopupView?: boolean;
} & Omit<UseSelectedCoinsProps, 'bundleId' | 'assetBalances'>;

export const CoinInput = ({
  bundleId,
  assetBalances,
  onAddAsset,
  canAddMoreAssets,
  spendableCoin,
  isPopupView,
  ...selectedCoinsProps
}: CoinInputProps): React.ReactElement => {
  const { t } = useTranslation();
  const { setCoinValues } = useCoinStateSelector(bundleId);
  const { selectedCoins } = useSelectedCoins({ bundleId, assetBalances, spendableCoin, ...selectedCoinsProps });
  const { lockedStakeRewards } = useRewardAccountsData();

  useEffect(() => {
    const { tempOutputs } = getTemporaryTxDataFromStorage();
    if (!tempOutputs || tempOutputs.length === 0) return;
    setCoinValues(bundleId, tempOutputs);
  }, [bundleId, setCoinValues]);

  return (
    <>
      <AssetInputList
        disabled={(!!assetBalances && assetBalances?.size === 0) || !canAddMoreAssets}
        rows={selectedCoins}
        onAddAsset={onAddAsset}
        translations={{ addAsset: t('browserView.transaction.send.advanced.asset') }}
        isPopupView={isPopupView}
      />
      {!!lockedStakeRewards && <LockedStakeRewardsBanner isPopupView={isPopupView} />}
    </>
  );
};
