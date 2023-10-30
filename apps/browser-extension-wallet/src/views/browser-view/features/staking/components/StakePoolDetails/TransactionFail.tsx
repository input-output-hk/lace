/* eslint-disable react/no-multi-comp */
import React, { useState } from 'react';
import cn from 'classnames';
import { useTranslation } from 'react-i18next';
import { Button } from '@lace/common';
import { ResultMessage } from '@components/ResultMessage';
import { Sections } from '../../types';
import { useStakePoolDetails, sectionsConfig } from '../../store';
import Exclamation from '../../../../../../assets/images/Exclamation.png';
import styles from './TransactionComplete.module.scss';
import { useDelegationTransaction } from '@views/browser/features/staking/hooks';
import { usePassword } from '@views/browser/features/send-transaction';
import { useDelegationStore } from '@src/features/delegation/stores';
import { useWalletManager } from '@hooks';
import {
  MatomoEventActions,
  MatomoEventCategories,
  AnalyticsEventNames,
  PostHogAction
} from '@providers/AnalyticsProvider/analyticsTracker';
import { useAnalyticsContext } from '@providers';

type TransactionFailProps = {
  popupView?: boolean;
};

export const TransactionFail = ({ popupView }: TransactionFailProps): React.ReactElement => {
  const { t } = useTranslation();

  return (
    <div className={cn(styles.container, styles.fail, { [styles.popupView]: popupView })}>
      <div className={styles.containerFail}>
        <ResultMessage
          customBgImg={popupView ? Exclamation : undefined}
          status="error"
          title={t('browserView.staking.details.fail.title')}
          description={t('browserView.staking.details.fail.subTitle')}
        />
      </div>
    </div>
  );
};

export const TransactionFailFooter = ({ popupView }: TransactionFailProps): React.ReactElement => {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { setIsDrawerVisible, resetStates, setSection } = useStakePoolDetails();
  const { setDelegationTxBuilder } = useDelegationStore();
  const { password, removePassword } = usePassword();
  const { executeWithPassword } = useWalletManager();
  const analytics = useAnalyticsContext();

  const closeDrawer = () => {
    analytics.sendEventToMatomo({
      category: MatomoEventCategories.STAKING,
      action: MatomoEventActions.CLICK_EVENT,
      name: popupView
        ? AnalyticsEventNames.Staking.STAKING_FAIL_POPUP
        : AnalyticsEventNames.Staking.STAKING_FAIL_BROWSER
    });
    analytics.sendEventToPostHog(PostHogAction.StakingManageDelegationSomethingWentWrongCancelClick);
    setDelegationTxBuilder();
    setIsDrawerVisible(false);
    resetStates();
  };

  const { signAndSubmitTransaction } = useDelegationTransaction();

  const onSubmit = async () => {
    setIsLoading(true);
    try {
      await signAndSubmitTransaction();
      setIsLoading(false);
      setSection(sectionsConfig[Sections.SUCCESS_TX]);
      removePassword();
    } catch (error) {
      console.error('failed to sign or submit tx due to:', error);
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.footerFail}>
      <Button
        onClick={() => {
          analytics.sendEventToPostHog(PostHogAction.StakingManageDelegationSomethingWentWrongCancelClick);
          closeDrawer();
        }}
        color="secondary"
        className={styles.btn}
        size="large"
        data-testid="staking-fail-close-button"
      >
        {t('browserView.staking.details.fail.btn.close')}
      </Button>
      {popupView ? (
        <Button
          onClick={() => {
            analytics.sendEventToPostHog(PostHogAction.StakingManageDelegationSomethingWentWrongBackClick);
            setSection(sectionsConfig[sectionsConfig.fail_tx.prevSection]);
          }}
          color="primary"
          className={styles.btn}
          size="large"
        >
          {t('browserView.staking.details.fail.btn.back')}
        </Button>
      ) : (
        <Button
          onClick={() => executeWithPassword(password, onSubmit)}
          className={styles.btn}
          size="large"
          loading={isLoading}
          disabled={isLoading}
          data-testid="staking-fail-retry-button"
        >
          {t('browserView.staking.details.fail.btn.retry')}
        </Button>
      )}
    </div>
  );
};
