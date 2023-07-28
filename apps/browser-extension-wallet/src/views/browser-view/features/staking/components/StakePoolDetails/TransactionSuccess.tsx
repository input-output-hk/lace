/* eslint-disable react/no-multi-comp */
import React, { useEffect, useMemo } from 'react';
import cn from 'classnames';
import { useTranslation } from 'react-i18next';
import { Button } from '@lace/common';
import { Wallet } from '@lace/cardano';
import { ResultMessage } from '@components/ResultMessage';
import { useDelegationStore } from '@src/features/delegation/stores';
import { useStakePoolDetails } from '../../store';
import styles from './TransactionComplete.module.scss';
import Success from '@src/assets/icons/success-staking.svg';
import {
  MatomoEventActions,
  MatomoEventCategories,
  AnalyticsEventNames,
  PostHogAction
} from '@providers/AnalyticsProvider/analyticsTracker';
import { useAnalyticsContext } from '@providers';

import { useWalletStore } from '@src/stores';
import { useSubmitingState } from '../../../send-transaction';

type TransactionSuccessProps = {
  popupView?: boolean;
};

export const TransactionSuccess = ({ popupView }: TransactionSuccessProps): React.ReactElement => {
  const { t } = useTranslation();
  const { isRestaking } = useSubmitingState();

  const analytics = useAnalyticsContext();

  useEffect(() => {
    analytics.sendEventToPostHog(PostHogAction.StakingManageDelegationHurrayView);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={cn(styles.container, { [styles.popupView]: popupView })}>
      <ResultMessage
        customBgImg={Success}
        title={
          isRestaking
            ? t('browserView.staking.details.switchedPools.title')
            : t('browserView.staking.details.success.title')
        }
        description={
          isRestaking
            ? t('browserView.staking.details.switchedPools.subTitle')
            : t('browserView.staking.details.success.title')
        }
      />
    </div>
  );
};

export const TransactionSuccessFooter = ({ popupView }: { popupView: boolean }): React.ReactElement => {
  const { t } = useTranslation();
  const { setIsDrawerVisible, resetStates } = useStakePoolDetails();
  const { setDelegationTxBuilder } = useDelegationStore();
  const analytics = useAnalyticsContext();
  const { getKeyAgentType } = useWalletStore();
  const isInMemory = useMemo(() => getKeyAgentType() === Wallet.KeyManagement.KeyAgentType.InMemory, [getKeyAgentType]);

  const closeDrawer = () => {
    analytics.sendEventToMatomo({
      category: MatomoEventCategories.STAKING,
      action: MatomoEventActions.CLICK_EVENT,
      name: popupView
        ? AnalyticsEventNames.Staking.STAKING_SUCCESS_POPUP
        : AnalyticsEventNames.Staking.STAKING_SUCCESS_BROWSER
    });
    analytics.sendEventToPostHog(PostHogAction.StakingManageDelegationHurrayCloseClick);
    setDelegationTxBuilder();
    setIsDrawerVisible(false);
    resetStates();
    // TODO: Remove this once we pay the `keyAgent.signTransaction` Ledger tech debt up (so we are able to stake multiple times without reloading).
    if (!isInMemory) window.location.reload();
  };

  return (
    <div className={styles.footer}>
      <Button
        onClick={() => closeDrawer()}
        className={styles.confirmBtn}
        size="large"
        data-testid="transaction-success-footer-close-button"
      >
        {t('general.button.close')}
      </Button>
    </div>
  );
};
