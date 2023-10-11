/* eslint-disable react/no-multi-comp */
import { Button, Password, inputProps } from '@lace/common';
import cn from 'classnames';
import React, { ReactElement, useCallback, useMemo } from 'react';
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
    submittingState: { isPasswordValid },
  } = useOutsideHandles();

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
            error={isPasswordValid === false}
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
    walletStoreInMemoryWallet: inMemoryWallet,
    password: { password, removePassword },
    submittingState: { setSubmitingTxState, isSubmitingTx, setIsRestaking },
    delegationStoreDelegationTxBuilder: delegationTxBuilder,
    walletManagerExecuteWithPassword: executeWithPassword,
  } = useOutsideHandles();
  const { currentPortfolio, portfolioMutators } = useDelegationPortfolioStore((store) => ({
    currentPortfolio: store.currentPortfolio,
    portfolioMutators: store.mutators,
  }));
  const { t } = useTranslation();

  const isSubmitDisabled = useMemo(() => isSubmitingTx || !password, [isSubmitingTx, password]);

  const cleanPasswordInput = useCallback(() => {
    removePassword();
  }, [removePassword]);

  // TODO unify
  const signAndSubmitTransaction = useCallback(async () => {
    if (!delegationTxBuilder) throw new Error('Unable to submit transaction. The delegationTxBuilder not available');
    const signedTx = await delegationTxBuilder.build().sign();
    await inMemoryWallet.submitTx(signedTx.tx);
  }, [delegationTxBuilder, inMemoryWallet]);

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
    setSubmitingTxState({ isPasswordValid: true, isSubmitingTx: true });
    try {
      await signAndSubmitTransaction();
      cleanPasswordInput();
      sendAnalytics();
      setIsRestaking(currentPortfolio.length > 0);
      portfolioMutators.executeCommand({ type: 'DrawerContinue' });
      setSubmitingTxState({ isPasswordValid: true, isSubmitingTx: false });
    } catch (error) {
      // Error name is 'AuthenticationError' in dev build but 'W' in prod build
      // @ts-ignore TODO
      if (error.message?.includes('Authentication failure')) {
        setSubmitingTxState({ isPasswordValid: false, isSubmitingTx: false });
      } else {
        cleanPasswordInput();
        portfolioMutators.executeCommand({ type: 'DrawerFailure' });
        setSubmitingTxState({ isSubmitingTx: false });
      }
    }
  }, [
    setSubmitingTxState,
    signAndSubmitTransaction,
    cleanPasswordInput,
    sendAnalytics,
    setIsRestaking,
    currentPortfolio.length,
    portfolioMutators,
  ]);

  return (
    <div className={styles.footer}>
      <Button
        data-testid="stake-sign-confirmation-btn"
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        onClick={() => executeWithPassword(password!, handleVerifyPass)}
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
