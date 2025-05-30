import { AssetInputList } from '@lace/core';
import { useCoinStateSelector } from '../../../store';
import { Wallet } from '@lace/cardano';
import React, { useEffect } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { getTemporaryTxDataFromStorage } from '../../../helpers';
import { UseSelectedCoinsProps, useSelectedCoins } from './useSelectedCoins';
import { walletRoutePaths } from '@routes';
import { useDrawer } from '@src/views/browser-view/stores';
import { Link, useHistory } from 'react-router-dom';
import { Tooltip } from 'antd';
import Info from '../../../../../../../assets/icons/info.component.svg';
import styles from './CoinInput.module.scss';

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
  const [, setIsDrawerVisible] = useDrawer();
  const history = useHistory();

  useEffect(() => {
    const { tempOutputs } = getTemporaryTxDataFromStorage();
    if (!tempOutputs || tempOutputs.length === 0) return;
    setCoinValues(bundleId, tempOutputs);
  }, [bundleId, setCoinValues]);

  const stakingPath = isPopupView ? walletRoutePaths.earn : walletRoutePaths.staking;

  const onGoToStaking = () => {
    setIsDrawerVisible();
    history.push(stakingPath);
  };

  const lockedRewardsTooltip = (
    <Tooltip
      placement="topRight"
      title={
        <Trans
          i18nKey={'general.errors.lockedStakeRewards.description'}
          components={[<Link key="link" to={stakingPath} onClick={onGoToStaking} />]}
        />
      }
    >
      <Info className={styles.infoIcon} />
    </Tooltip>
  );

  return (
    <>
      <AssetInputList
        disabled={(!!assetBalances && assetBalances?.size === 0) || !canAddMoreAssets}
        rows={selectedCoins}
        onAddAsset={onAddAsset}
        translations={{ addAsset: t('browserView.transaction.send.advanced.asset') }}
        isPopupView={isPopupView}
        lockedRewardsTooltip={lockedRewardsTooltip}
      />
    </>
  );
};
