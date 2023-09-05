import React from 'react';
import { useTranslation } from 'react-i18next';
import { useStakePoolDetails } from '../store';
import { StakingModal } from './StakingModal';

type StakingModalsProps = {
  popupView?: boolean;
  onConfirm: () => void;
};

export const ChangingPreferencesModal = ({ onConfirm, popupView }: StakingModalsProps): React.ReactElement => {
  const { t } = useTranslation();
  const { setStakeConfirmationVisible, isStakeConfirmationVisible } = useStakePoolDetails();

  // TODO implement analytics for the new flow
  const analytics = {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    sendEvent: () => {},
  };

  return (
    <StakingModal
      visible={isStakeConfirmationVisible}
      title={t('modals.changingPreferences.title')}
      translationKey={t('modals.changingPreferences.description')}
      actions={[
        {
          body: t('modals.changingPreferences.buttons.cancel'),
          color: 'secondary',
          dataTestId: 'switch-pools-modal-cancel',
          onClick: () => setStakeConfirmationVisible(false),
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
            setStakeConfirmationVisible(false);
            onConfirm();
          },
        },
      ]}
      popupView={popupView}
      focusTriggerAfterClose={false}
    />
  );
};
