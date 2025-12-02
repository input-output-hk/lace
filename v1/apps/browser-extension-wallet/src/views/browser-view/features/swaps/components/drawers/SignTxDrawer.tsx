import React from 'react';
import { Button, Flex, PasswordBox, Text } from '@input-output-hk/lace-ui-toolkit';
import { Drawer, DrawerNavigation, PostHogAction } from '@lace/common';
import { ResultMessage } from '@components/ResultMessage';
import { TransactionHashBox } from '@components/TransactionHashBox';
import { useSecrets } from '@lace/core';
import { withSignTxConfirmation } from '@lib/wallet-api-ui';
import { SwapStage } from '../../types';
import { useSwaps } from '../SwapProvider';
import { useTranslation } from 'react-i18next';
import { useAnalyticsContext } from '@providers';
import { useHistory } from 'react-router-dom';
import { walletRoutePaths } from '@routes';
import styles from './SwapSuccessDrawer.module.scss';

export const SignTxDrawer = (): React.ReactElement => {
  const { t } = useTranslation();
  const { stage, setStage, signAndSubmitSwapRequest, transactionHash } = useSwaps();
  const { setPassword, password } = useSecrets();
  const analytics = useAnalyticsContext();
  const history = useHistory();

  const handleConfirm = async () => {
    try {
      await withSignTxConfirmation(signAndSubmitSwapRequest, password.value);
      // Stage will be set to Success in signAndSubmitSwapRequest on success
    } catch {
      // Error is already handled in signAndSubmitSwapRequest
      // The modal will stay open to show the error state
    }
  };

  const handleViewTransaction = () => {
    analytics?.sendEventToPostHog(PostHogAction.SendAllDoneViewTransactionClick);
    setStage(SwapStage.Initial);
    history.push(walletRoutePaths.activity);
  };

  const handleClose = () => {
    analytics?.sendEventToPostHog(PostHogAction.SendAllDoneCloseClick);
    setStage(SwapStage.Initial);
  };

  const isSuccess = stage === SwapStage.Success;
  const isOpen = stage === SwapStage.SignTx || isSuccess;

  return (
    <Drawer
      open={isOpen}
      onClose={handleClose}
      navigation={
        <DrawerNavigation
          title={t('swaps.signDrawer.heading')}
          onArrowIconClick={isSuccess ? undefined : () => setStage(SwapStage.SwapReview)}
          onCloseIconClick={handleClose}
        />
      }
      dataTestId="swap-sign-drawer"
      footer={
        isSuccess ? (
          <Flex flexDirection="column" gap="$16" w="$fill">
            <Button.CallToAction
              w="$fill"
              label={t('browserView.transaction.send.footer.review')}
              onClick={handleViewTransaction}
              data-testid="swap-success-view-transaction-button"
            />
            <Button.Secondary
              w="$fill"
              label={t('browserView.transaction.send.footer.close')}
              onClick={handleClose}
              data-testid="swap-success-close-button"
            />
          </Flex>
        ) : (
          <Button.CallToAction
            disabled={!password.value}
            w={'$fill'}
            label={t('dapp.transactions.confirm.title')}
            onClick={handleConfirm}
          />
        )
      }
    >
      {isSuccess ? (
        <div className={styles.successTxContainer} data-testid="swap-success-container">
          <ResultMessage
            title={<div>{t('browserView.transaction.success.youCanSafelyCloseThisPanel')}</div>}
            description={<div>{t('browserView.transaction.success.thisMayTakeAFewMinutes')}</div>}
          />
          {transactionHash && <TransactionHashBox hash={transactionHash} />}
        </div>
      ) : (
        <Flex flexDirection="column" justifyContent="space-between" alignItems="stretch" gap="$8" h={'$fill'}>
          <Flex flexDirection="column" gap="$8">
            <Text.SubHeading>{t('browserView.transaction.send.confirmationTitle')}</Text.SubHeading>
            <Text.Body.Normal>{t('browserView.transaction.send.signTransactionWithPassword')}</Text.Body.Normal>
          </Flex>
          <Flex flexDirection="column" justifyContent="center" alignItems="center" w="$fill" h="$fill">
            <PasswordBox
              onSubmit={(event) => {
                event.preventDefault();
                handleConfirm();
              }}
              label={t('core.walletNameAndPasswordSetupStep.confirmPasswordInputLabel')}
              onChange={setPassword}
            />
          </Flex>
        </Flex>
      )}
    </Drawer>
  );
};
