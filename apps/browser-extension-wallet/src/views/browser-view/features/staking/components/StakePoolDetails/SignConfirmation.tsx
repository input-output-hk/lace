/* eslint-disable react/no-multi-comp */
import React, { ReactElement, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import cn from 'classnames';
import { Button, inputProps, Password, useObservable } from '@lace/common';
import { useStakePoolDetails, sectionsConfig } from '../../store';
import { Sections } from '../../types';
import styles from './SignConfirmation.module.scss';
import { useDelegationTransaction } from '@views/browser/features/staking/hooks';
import { usePassword, useSubmitingState } from '@views/browser/features/send-transaction';
import { useDelegationDetails, useWalletManager } from '@hooks';
import {
  MatomoEventActions,
  MatomoEventCategories,
  AnalyticsEventNames,
  PostHogAction
} from '@providers/AnalyticsProvider/analyticsTracker';
import { useAnalyticsContext } from '@providers';
import { useWalletStore } from '@src/stores';

type SignConfirmationProps = {
  popupView?: boolean;
};

export const SignConfirmation = ({ popupView }: SignConfirmationProps): React.ReactElement => {
  const { t } = useTranslation();
  const { password, setPassword } = usePassword();
  const { isPasswordValid } = useSubmitingState();

  const handleChange: inputProps['onChange'] = ({ target: { value } }) => setPassword(value);

  return (
    <>
      <div className={cn(styles.header, { [styles.popupView]: popupView })}>
        <div className={styles.title} data-testid="staking-confirmation-title">
          {t('browserView.staking.details.confirmation.title')}
        </div>
        <div className={styles.subTitle} data-testid="staking-confirmation-subtitle">
          {t('browserView.transaction.send.enterWalletPasswordToConfirmTransaction')}
        </div>
      </div>
      <div className={cn(styles.container, { [styles.popupView]: popupView })}>
        <div className={styles.password}>
          <Password
            className={styles.passwordInput}
            onChange={handleChange}
            value={password}
            error={isPasswordValid === false}
            errorMessage={t('browserView.transaction.send.error.invalidPassword')}
            label={t('browserView.transaction.send.password.placeholder')}
            autoFocus
          />
        </div>
      </div>
    </>
  );
};

export const SignConfirmationFooter = ({ popupView }: { popupView: boolean }): ReactElement => {
  const { t } = useTranslation();
  const { password, removePassword } = usePassword();
  const { signAndSubmitTransaction } = useDelegationTransaction();
  const { setSubmitingTxState, isSubmitingTx, setIsRestaking } = useSubmitingState();
  const { setSection } = useStakePoolDetails();
  const { executeWithPassword } = useWalletManager();
  const analytics = useAnalyticsContext();
  const { inMemoryWallet } = useWalletStore();
  const rewardAccounts = useObservable(inMemoryWallet.delegation.rewardAccounts$);
  const delegationDetails = useDelegationDetails();
  const isDelegating = !!(rewardAccounts && delegationDetails);

  const isSubmitDisabled = useMemo(() => isSubmitingTx || !password, [isSubmitingTx, password]);

  const cleanPasswordInput = useCallback(() => {
    removePassword();
  }, [removePassword]);

  const sendAnalytics = useCallback(() => {
    analytics.sendEventToMatomo({
      category: MatomoEventCategories.STAKING,
      action: MatomoEventActions.CLICK_EVENT,
      name: popupView
        ? AnalyticsEventNames.Staking.STAKING_SIGN_CONFIRMATION_POPUP
        : AnalyticsEventNames.Staking.STAKING_SIGN_CONFIRMATION_BROWSER
    });

    analytics.sendEventToPostHog(PostHogAction.StakingManageDelegationPasswordConfirmationConfirmClick);
  }, [analytics, popupView]);

  const handleVerifyPass = useCallback(async () => {
    setSubmitingTxState({ isPasswordValid: true, isSubmitingTx: true });
    try {
      await signAndSubmitTransaction();
      cleanPasswordInput();
      sendAnalytics();
      setIsRestaking(isDelegating);
      setSection(sectionsConfig[Sections.SUCCESS_TX]);
      setSubmitingTxState({ isPasswordValid: true, isSubmitingTx: false });
    } catch (error) {
      // Error name is 'AuthenticationError' in dev build but 'W' in prod build
      if (error.message?.includes('Authentication failure')) {
        setSubmitingTxState({ isPasswordValid: false, isSubmitingTx: false });
      } else {
        setSection(sectionsConfig[Sections.FAIL_TX]);
        setSubmitingTxState({ isSubmitingTx: false });
      }
    }
  }, [
    setSubmitingTxState,
    signAndSubmitTransaction,
    cleanPasswordInput,
    sendAnalytics,
    setSection,
    setIsRestaking,
    isDelegating
  ]);

  return (
    <div className={styles.footer}>
      <Button
        data-testid="stake-sign-confirmation-btn"
        onClick={() => executeWithPassword(password, handleVerifyPass)}
        disabled={isSubmitDisabled}
        loading={isSubmitingTx}
        className={styles.confirmBtn}
        size="large"
      >
        {t('general.button.confirm')}
      </Button>
    </div>
  );
};
