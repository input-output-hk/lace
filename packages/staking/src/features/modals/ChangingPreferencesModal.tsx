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

  // TODO implement analytics for the new flow
  const analytics = {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    sendEvent: () => {},
  };

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
          onClick: () => portfolioMutators.executeCommand({ type: 'DiscardChangingPreferences' }),
        },
        {
          body: t('modals.changingPreferences.buttons.confirm'),
          dataTestId: 'switch-pools-modal-confirm',
          onClick: () => {
            // @ts-ignore
            analytics.sendEvent({
              action: 'AnalyticsEventActions.CLICK_EVENT',
              category: 'AnalyticsEventCategories.STAKING',
              name: popupView
                ? 'AnalyticsEventNames.Staking.CONFIRM_SWITCH_POOL_POPUP'
                : 'AnalyticsEventNames.Staking.CONFIRM_SWITCH_POOL_BROWSER',
            });
            portfolioMutators.executeCommand({ type: 'ConfirmChangingPreferences' });
          },
        },
      ]}
      popupView={popupView}
      focusTriggerAfterClose={false}
    />
  );
};
