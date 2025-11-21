/* eslint-disable react/no-multi-comp */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useDrawer } from '@views/browser/stores';
import { DrawerContent } from '@views/browser/components/Drawer/DrawerUIContent';
import { useStakePoolDetails, sectionsConfig } from '../../store';
import { Sections } from '../../types';
import { StakingModal } from './StakingModal';
import { PostHogAction } from '@providers/AnalyticsProvider/analyticsTracker';
import { useAnalyticsContext } from '@providers';
import { DrawerHeader, DrawerNavigation } from '@lace/common';

type StakingModalsProps = {
  popupView?: boolean;
};

export const StakingModals = ({ popupView }: StakingModalsProps): React.ReactElement => {
  const { t } = useTranslation();
  const {
    isNoFundsVisible,
    setNoFundsVisible,
    isExitStakingVisible,
    setExitStakingVisible,
    setStakeConfirmationVisible,
    isStakeConfirmationVisible,
    setIsDrawerVisible,
    setSection,
    resetStates
  } = useStakePoolDetails();

  const [, setDrawerConfig] = useDrawer();
  const analytics = useAnalyticsContext();

  return (
    <>
      {/* Switching pools */}
      <StakingModal
        visible={isStakeConfirmationVisible}
        title={t('browserView.staking.details.switchingPoolsModal.title')}
        description={t('browserView.staking.details.switchingPoolsModal.description')}
        actions={[
          {
            body: t('browserView.staking.details.switchingPoolsModal.buttons.cancel'),
            dataTestId: 'switch-pools-modal-cancel',
            color: 'secondary',
            onClick: () => setStakeConfirmationVisible(false)
          },
          {
            dataTestId: 'switch-pools-modal-confirm',
            onClick: () => {
              analytics.sendEventToPostHog(PostHogAction.StakingSwitchingPoolFineByMeClick);
              setStakeConfirmationVisible(false);
              setSection(sectionsConfig[Sections.CONFIRMATION]);
              setIsDrawerVisible(true);
            },
            body: t('browserView.staking.details.switchingPoolsModal.buttons.confirm')
          }
        ]}
        popupView={popupView}
      />
      {/* Exit staking */}
      <StakingModal
        visible={isExitStakingVisible}
        title={t('browserView.staking.details.exitStakingModal.title')}
        description={t('browserView.staking.details.exitStakingModal.description')}
        actions={[
          {
            body: t('browserView.staking.details.exitStakingModal.buttons.cancel'),
            dataTestId: 'exit-staking-modal-cancel',
            onClick: () => setExitStakingVisible(false),
            color: 'secondary'
          },
          {
            body: t('browserView.staking.details.exitStakingModal.buttons.confirm'),
            dataTestId: 'exit-staking-modal-confirm',
            onClick: () => {
              setExitStakingVisible(false);
              setIsDrawerVisible(false);
              resetStates();
            }
          }
        ]}
        popupView={popupView}
      />
      {/* No funds */}
      <StakingModal
        visible={isNoFundsVisible}
        title={t('browserView.staking.details.noFundsModal.title')}
        description={t('browserView.staking.details.noFundsModal.description')}
        actions={[
          {
            body: t('browserView.staking.details.noFundsModal.buttons.cancel'),
            dataTestId: 'no-funds-modal-cancel',
            onClick: () => setNoFundsVisible(false),
            color: 'secondary'
          },
          {
            body: t('browserView.staking.details.noFundsModal.buttons.confirm'),
            dataTestId: 'no-funds-modal-confirm',
            onClick: () => {
              setNoFundsVisible(false);
              setDrawerConfig({
                content: DrawerContent.RECEIVE_TRANSACTION,
                renderHeader: () => (
                  <DrawerNavigation title={t('qrInfo.receive')} onCloseIconClick={() => setDrawerConfig()} />
                ),
                renderTitle: () => (
                  <DrawerHeader title={t('qrInfo.title')} subtitle={t('qrInfo.scanQRCodeToConnectWallet')} />
                )
              });
              setIsDrawerVisible(false);
            }
          }
        ]}
        popupView={popupView}
      />
    </>
  );
};
