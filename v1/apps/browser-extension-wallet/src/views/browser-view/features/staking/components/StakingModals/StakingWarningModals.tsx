import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { stakingInfoSelector } from '@stores/selectors/staking-selectors';
import { useWalletStore } from '@stores';
import { walletRoutePaths } from '@routes/wallet-paths';
import { useDelegationDetails, useLocalStorage } from '@src/hooks';
import { Wallet } from '@lace/cardano';
import { StakingModal } from './StakingModal';

const totalSaturationPercentage = 100;
// Contains the epoch, when user has been warned about retired or oversaturated stakepool
const lastStakingStorageKey = 'lastStaking';

type StakingWarningModalsProps = {
  popupView?: boolean;
};

export const StakingWarningModals = ({ popupView }: StakingWarningModalsProps): React.ReactElement => {
  const { t } = useTranslation();
  const history = useHistory();
  const [isOversaturatedModalVisible, setIsOversaturatedModalVisible] = useState<boolean>(false);
  const [isRetiredModalVisible, setIsRetiredModalVisible] = useState<boolean>(false);
  const [lastStaking, { updateLocalStorage: setLastStaking }] = useLocalStorage(lastStakingStorageKey);
  const { networkInfo, fetchNetworkInfo } = useWalletStore(stakingInfoSelector);
  const {
    walletUI: { cardanoCoin }
  } = useWalletStore();

  useEffect(() => {
    fetchNetworkInfo();
  }, [fetchNetworkInfo]);

  const delegationDetails = useDelegationDetails();
  const {
    saturation,
    retired,
    id: poolId
  } = (delegationDetails && Wallet.util.stakePoolTransformer({ stakePool: delegationDetails, cardanoCoin })) || {};

  useEffect(() => {
    if (delegationDetails !== undefined && poolId !== lastStaking?.poolId) {
      setLastStaking({});
    }
  }, [poolId, setLastStaking, lastStaking?.poolId, lastStaking?.epoch, delegationDetails]);

  useEffect(() => {
    if (!networkInfo?.currentEpoch || !poolId || networkInfo.currentEpoch === lastStaking?.epoch) return;
    if (retired) {
      setIsRetiredModalVisible(true);
      setLastStaking({ epoch: networkInfo.currentEpoch, poolId });
    } else if (Number(saturation) > totalSaturationPercentage) {
      setIsOversaturatedModalVisible(true);
      setLastStaking({ epoch: networkInfo.currentEpoch, poolId });
    }
  }, [saturation, retired, setLastStaking, networkInfo?.currentEpoch, lastStaking?.epoch, poolId]);

  return (
    <>
      {/* Oversaturated */}
      <StakingModal
        visible={isOversaturatedModalVisible}
        title={t('browserView.staking.details.poolOversaturatedModal.title')}
        description={t('browserView.staking.details.poolOversaturatedModal.description')}
        actions={[
          {
            body: t('browserView.staking.details.poolOversaturatedModal.buttons.confirm'),
            dataTestId: 'stake-oversaturated-modal-confirm',
            onClick: () => {
              history.push(walletRoutePaths.staking);
              setIsOversaturatedModalVisible(false);
            }
          }
        ]}
        popupView={popupView}
      />
      {/* Retired */}
      <StakingModal
        visible={isRetiredModalVisible}
        title={t('browserView.staking.details.poolRetiredModal.title')}
        description={t('browserView.staking.details.poolRetiredModal.description')}
        actions={[
          {
            body: t('browserView.staking.details.poolRetiredModal.buttons.confirm'),
            dataTestId: 'stake-retired-modal-confirm',
            onClick: () => {
              history.push(walletRoutePaths.staking);
              setIsRetiredModalVisible(false);
            }
          }
        ]}
        popupView={popupView}
      />
    </>
  );
};
