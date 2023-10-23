/* eslint-disable react/no-multi-comp */
import { Button, Password, inputProps } from '@lace/common';
import cn from 'classnames';
import React, { ReactElement, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useOutsideHandles } from '../outside-handles-provider';
import { useDelegationPortfolioStore } from '../store';
import styles from './SignConfirmation.module.scss';

interface SignConfirmationProps {
  popupView?: boolean;
}

export const SignConfirmation = ({ popupView }: SignConfirmationProps): React.ReactElement => {
  const { t } = useTranslation();
  const {
    password: { password, setPassword },
  } = useOutsideHandles();
  const { passwordInvalid } = useDelegationPortfolioStore((store) => ({
    passwordInvalid: store.transaction?.passwordInvalid,
  }));

  const handleChange: inputProps['onChange'] = ({ target: { value } }) => setPassword(value);

  return (
    <>
      {/* eslint-disable-next-line @typescript-eslint/no-non-null-assertion */}
      <div className={cn(styles.header, { [styles.popupView!]: popupView })}>
        <div className={styles.title} data-testid="staking-confirmation-title">
          {t('drawer.sign.confirmation.title')}
        </div>
        <div className={styles.subTitle} data-testid="staking-confirmation-subtitle">
          {t('drawer.sign.enterWalletPasswordToConfirmTransaction')}
        </div>
      </div>
      {/* eslint-disable-next-line @typescript-eslint/no-non-null-assertion */}
      <div className={cn(styles.container, { [styles.popupView!]: popupView })}>
        <div className={styles.password}>
          <Password
            className={styles.passwordInput}
            onChange={handleChange}
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            value={password!}
            error={passwordInvalid === true}
            errorMessage={t('drawer.sign.error.invalidPassword')}
            label={t('drawer.sign.passwordPlaceholder')}
            autoFocus
          />
        </div>
      </div>
    </>
  );
};

export const SignConfirmationFooter = ({ popupView }: SignConfirmationProps): ReactElement => {
  const {
    password: { password, removePassword },
    walletManagerExecuteWithPassword: executeWithPassword,
  } = useOutsideHandles();
  const { portfolioMutators, passwordInvalid } = useDelegationPortfolioStore((store) => ({
    passwordInvalid: store.transaction?.passwordInvalid,
    portfolioMutators: store.mutators,
  }));
  const { t } = useTranslation();

  const [isSubmittingTx, setIsSubmittingTx] = useState(false);
  const isSubmitDisabled = useMemo(() => isSubmittingTx || !password, [isSubmittingTx, password]);

  const cleanPasswordInput = useCallback(() => {
    removePassword();
  }, [removePassword]);

  const sendAnalytics = useCallback(() => {
    // TODO implement analytics for the new flow
    const analytics = {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      sendEvent: () => {},
    };
    // @ts-ignore
    analytics.sendEvent({
      action: 'AnalyticsEventActions.CLICK_EVENT',
      category: 'AnalyticsEventCategories.STAKING',
      name: popupView
        ? 'AnalyticsEventNames.Staking.STAKING_SIGN_CONFIRMATION_POPUP'
        : 'AnalyticsEventNames.Staking.STAKING_SIGN_CONFIRMATION_BROWSER',
    });
  }, [popupView]);

  const handleVerifyPass = useCallback(async () => {
    setIsSubmittingTx(true); // TODO: move to store, doesnt work
    portfolioMutators.executeCommand({ type: 'SignSubmitTx' });
    sendAnalytics();
    setIsSubmittingTx(false); // TODO: move to store, doesnt work
  }, [sendAnalytics, portfolioMutators]);

  useEffect(() => {
    if (isSubmittingTx && passwordInvalid === false) {
      cleanPasswordInput();
    }
  }, [isSubmittingTx, passwordInvalid, cleanPasswordInput]);

  return (
    <div className={styles.footer}>
      <Button
        data-testid="stake-sign-confirmation-btn"
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        onClick={() => executeWithPassword(password!, handleVerifyPass)} // move to machine
        disabled={isSubmitDisabled}
        loading={isSubmittingTx}
        className={styles.confirmBtn}
        size="large"
      >
        {t('general.button.confirm')}
      </Button>
    </div>
  );
};
