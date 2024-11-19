import { AssetInputList } from '@lace/core';
import cn from 'classnames';
import { useHistory } from 'react-router-dom';
import { useCoinStateSelector } from '../../../store';
import { Wallet } from '@lace/cardano';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getTemporaryTxDataFromStorage } from '../../../helpers';
import { UseSelectedCoinsProps, useSelectedCoins } from './useSelectedCoins';
import { Banner } from '@lace/common';
import { walletRoutePaths } from '@routes';
import styles from './CoinInput.module.scss';
import { Box, Button, Flex, Text } from '@input-output-hk/lace-ui-toolkit';
import { useDrawer } from '@src/views/browser-view/stores';
import ExclamationCircleOutline from '@src/assets/icons/red-exclamation-circle.component.svg';

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
  const history = useHistory();
  const { setCoinValues } = useCoinStateSelector(bundleId);
  const { selectedCoins } = useSelectedCoins({ bundleId, assetBalances, spendableCoin, ...selectedCoinsProps });
  const [, setIsDrawerVisible] = useDrawer();

  useEffect(() => {
    const { tempOutputs } = getTemporaryTxDataFromStorage();
    if (!tempOutputs || tempOutputs.length === 0) return;
    setCoinValues(bundleId, tempOutputs);
  }, [bundleId, setCoinValues]);

  const onGoToStaking = () => {
    const path = isPopupView ? walletRoutePaths.earn : walletRoutePaths.staking;
    setIsDrawerVisible();
    history.push(path);
  };

  return (
    <>
      <AssetInputList
        disabled={(!!assetBalances && assetBalances?.size === 0) || !canAddMoreAssets}
        rows={selectedCoins}
        onAddAsset={onAddAsset}
        translations={{ addAsset: t('browserView.transaction.send.advanced.asset') }}
        isPopupView={isPopupView}
      />
      {isPopupView ? (
        <Flex className={styles.bannerPopup} flexDirection="column" py="$16" px="$24" gap="$24">
          <Text.Button>{t('general.errors.lockedStakeRewards.description')}</Text.Button>
          <Button.CallToAction
            w="$fill"
            onClick={onGoToStaking}
            data-testid="stats-register-as-drep-cta"
            label={t('general.errors.lockedStakeRewards.cta')}
          />
        </Flex>
      ) : (
        <Banner
          customIcon={<ExclamationCircleOutline />}
          popupView={isPopupView}
          className={cn(styles.banner, { [styles.popupView]: isPopupView })}
          message={<Box className={styles.bannerDescription}>{t('general.errors.lockedStakeRewards.description')}</Box>}
          buttonMessage={t('general.errors.lockedStakeRewards.cta')}
          onButtonClick={onGoToStaking}
          withIcon
        />
      )}
    </>
  );
};
