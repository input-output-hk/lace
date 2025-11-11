import React from 'react';
import { Button, Flex } from '@input-output-hk/lace-ui-toolkit';
import { Drawer, DrawerNavigation, PostHogAction } from '@lace/common';
import { ResultMessage } from '@components/ResultMessage';
import { TransactionHashBox } from '@components/TransactionHashBox';
import { SwapStage } from '../../types';
import { useSwaps } from '../SwapProvider';
import { useTranslation } from 'react-i18next';
import { useAnalyticsContext } from '@providers';
import { useHistory } from 'react-router-dom';
import { walletRoutePaths } from '@routes';
import styles from './SwapSuccessDrawer.module.scss';

export const SwapSuccessDrawer = (): React.ReactElement => {
  const { t } = useTranslation();
  const { stage, setStage, transactionHash } = useSwaps();
  const analytics = useAnalyticsContext();
  const history = useHistory();

  const handleViewTransaction = () => {
    analytics?.sendEventToPostHog(PostHogAction.SendAllDoneViewTransactionClick);
    setStage(SwapStage.Initial);
    history.push(walletRoutePaths.activity);
  };

  const handleClose = () => {
    analytics?.sendEventToPostHog(PostHogAction.SendAllDoneCloseClick);
    setStage(SwapStage.Initial);
  };

  return (
    <Drawer
      open={stage === SwapStage.Success}
      onClose={handleClose}
      navigation={<DrawerNavigation title={t('swaps.pageHeading')} onCloseIconClick={handleClose} />}
      dataTestId="swap-success-drawer"
      maskClosable
      footer={
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
      }
    >
      <div className={styles.successTxContainer} data-testid="swap-success-container">
        <ResultMessage
          title={<div>{t('browserView.transaction.success.youCanSafelyCloseThisPanel')}</div>}
          description={<div>{t('browserView.transaction.success.thisMayTakeAFewMinutes')}</div>}
        />
        {transactionHash && <TransactionHashBox hash={transactionHash} />}
      </div>
    </Drawer>
  );
};
