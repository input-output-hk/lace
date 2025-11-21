import { PostHogAction } from '@lace/common';
import { useOutsideHandles } from 'features/outside-handles-provider';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { DelegationFlow, useDelegationPortfolioStore } from '../store';
import { StakingModal } from './StakingModal';

type StakingModalsProps = {
  popupView?: boolean;
};

export const ChangingPreferencesModal = ({ popupView }: StakingModalsProps): React.ReactElement => {
  const { t } = useTranslation();
  const { portfolioMutators, visible } = useDelegationPortfolioStore((store) => ({
    portfolioMutators: store.mutators,
    visible: store.activeDelegationFlow === DelegationFlow.ChangingPreferences,
  }));
  const { analytics, isSharedWallet } = useOutsideHandles();

  return (
    <StakingModal
      visible={visible}
      title={t('modals.changingPreferences.title')}
      description={t('modals.changingPreferences.description')}
      actions={[
        {
          body: t('modals.changingPreferences.buttons.cancel'),
          color: 'secondary',
          dataTestId: 'switch-pools-modal-cancel',
          onClick: () => {
            analytics.sendEventToPostHog(PostHogAction.StakingChangingStakingPreferencesCancelClick);
            portfolioMutators.executeCommand({ type: 'DiscardChangingPreferences' });
          },
        },
        {
          body: t('modals.changingPreferences.buttons.confirm'),
          dataTestId: 'switch-pools-modal-confirm',
          onClick: () => {
            analytics.sendEventToPostHog(PostHogAction.StakingChangingStakingPreferencesFineByMeClick);
            portfolioMutators.executeCommand({ data: { isSharedWallet }, type: 'ConfirmChangingPreferences' });
          },
        },
      ]}
      popupView={popupView}
      focusTriggerAfterClose={false}
    />
  );
};
