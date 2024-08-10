/* eslint-disable react/no-multi-comp */
import { Flex, Text } from '@input-output-hk/lace-ui-toolkit';
import { Button, Password, PostHogAction } from '@lace/common';
import cn from 'classnames';
import React, { ReactElement, useCallback, useMemo } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useOutsideHandles } from '../outside-handles-provider';
import { useDelegationPortfolioStore } from '../store';
import styles from './SignConfirmation.module.scss';

interface SignConfirmationProps {
  popupView?: boolean;
}

export const SignConfirmation = ({ popupView }: SignConfirmationProps): React.ReactElement => {
  const { t } = useTranslation();
  const {
    password: { setPassword },
    submittingState: { isPasswordValid },
    signPolicy,
    isSharedWallet,
    walletName,
  } = useOutsideHandles();

  return (
    <>
      {/* eslint-disable-next-line @typescript-eslint/no-non-null-assertion */}
      <div className={cn(styles.header, { [styles.popupView!]: popupView })}>
        <Flex gap="$8" alignItems="flex-end" className={styles.title} data-testid="staking-confirmation-title">
          {t('drawer.sign.confirmation.title')}
          {isSharedWallet && (
            <Text.Body.Normal color="secondary" weight="$bold">
              {t('drawer.sign.confirmation.titleSuffix', { num: 1, total: signPolicy.signers.length })}
            </Text.Body.Normal>
          )}
        </Flex>
        <div className={styles.subTitle} data-testid="staking-confirmation-subtitle">
          {!isSharedWallet ? (
            t('drawer.sign.enterWalletPasswordToConfirmTransaction')
          ) : (
            <Trans
              i18nKey="drawer.sign.signSharedTx"
              t={t}
              values={{ name: walletName }}
              components={{
                b: <Text.Body.Normal weight="$bold" />,
              }}
            />
          )}
        </div>
      </div>
      {/* eslint-disable-next-line @typescript-eslint/no-non-null-assertion */}
      <div className={cn(styles.container, { [styles.popupView!]: popupView })}>
        <div className={styles.password}>
          <Password
            className={styles.passwordInput}
            onChange={({ value }) => {
              setPassword(value);
            }}
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

export const SignConfirmationFooter = (): ReactElement => {
  const {
    walletStoreInMemoryWallet: inMemoryWallet,
    password: { password, removePassword },
    submittingState: { setSubmitingTxState, isSubmitingTx, setIsRestaking },
    delegationStoreDelegationTxBuilder: delegationTxBuilder,
    walletManagerExecuteWithPassword: executeWithPassword,
    isSharedWallet,
    sharedWalletKey,
    signPolicy,
  } = useOutsideHandles();
  const { currentPortfolio, portfolioMutators } = useDelegationPortfolioStore((store) => ({
    currentPortfolio: store.currentPortfolio,
    portfolioMutators: store.mutators,
  }));
  const { analytics } = useOutsideHandles();
  const { t } = useTranslation();

  const isSubmitDisabled = useMemo(() => isSubmitingTx || !password, [isSubmitingTx, password]);

  const cleanPasswordInput = useCallback(() => {
    removePassword();
  }, [removePassword]);

  // TODO unify
  const signAndSubmitTransaction = useCallback(async () => {
    if (!delegationTxBuilder) throw new Error('Unable to submit transaction. The delegationTxBuilder not available');

    if (isSharedWallet && sharedWalletKey) {
      // TODO: integrate with tx summary drawer LW-10970
      const tx = await delegationTxBuilder.build().inspect();

      const signedTx = await inMemoryWallet.finalizeTx({ tx });
      if (signPolicy.requiredCosigners === 1) {
        await inMemoryWallet.submitTx(signedTx);
      }
    } else {
      const signedTx = await delegationTxBuilder.build().sign();
      await inMemoryWallet.submitTx(signedTx);
    }
  }, [delegationTxBuilder, inMemoryWallet, isSharedWallet, signPolicy?.requiredCosigners, sharedWalletKey]);

  const handleVerifyPass = useCallback(async () => {
    analytics.sendEventToPostHog(PostHogAction.StakingManageDelegationPasswordConfirmationConfirmClick);
    setSubmitingTxState({ isPasswordValid: true, isSubmitingTx: true });
    try {
      await signAndSubmitTransaction();
      cleanPasswordInput();
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
    analytics,
    setIsRestaking,
    currentPortfolio.length,
    portfolioMutators,
  ]);

  return (
    <div className={styles.footer}>
      <Button
        data-testid="stake-sign-confirmation-btn"
        onClick={() => executeWithPassword(handleVerifyPass, password)}
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
