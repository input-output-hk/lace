/* eslint-disable react/no-multi-comp */
import { Box, SummaryExpander, TransactionSummary } from '@input-output-hk/lace-ui-toolkit';
import { Button } from '@lace/common';
import cn from 'classnames';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useOutsideHandles } from '../outside-handles-provider';
import { useDelegationPortfolioStore } from '../store';
import { ResultMessage } from './ResultMessage';
import styles from './TransactionComplete.module.scss';

type HwDeviceFailProps = {
  popupView?: boolean;
};

export const HwDeviceFail = ({ popupView }: HwDeviceFailProps): React.ReactElement => {
  const { t } = useTranslation();
  const { txError } = useDelegationPortfolioStore((store) => ({
    txError: store.txError,
  }));

  return (
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    <div className={cn(styles.container, styles.fail, { [styles.popupView!]: popupView })}>
      <div className={cn(styles.containerFail, styles.staking)}>
        <ResultMessage
          fullWidth
          status="error"
          title={t('drawer.failure.deviceUpdate.title')}
          description={
            <>
              {t('drawer.failure.deviceUpdate.subTitle')}
              {typeof txError === 'object' && txError.message && (
                <Box w="$fill">
                  <SummaryExpander title={t('browserView.transaction.fail.error-details.label')} plain>
                    <TransactionSummary.Other
                      label={txError.name || t('browserView.transaction.fail.error-details.error-name-fallback')}
                      text={txError.message}
                    />
                  </SummaryExpander>
                </Box>
              )}
            </>
          }
        />
      </div>
    </div>
  );
};

export const HwDeviceFailFooter = ({ popupView }: HwDeviceFailProps): React.ReactElement => {
  const { t } = useTranslation();
  const { delegationStoreSetDelegationTxBuilder: setDelegationTxBuilder } = useOutsideHandles();
  // TODO implement analytics for the new flow
  const analytics = {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    sendEvent: () => {},
  };
  const { portfolioMutators } = useDelegationPortfolioStore((store) => ({
    portfolioMutators: store.mutators,
  }));

  const closeDrawer = () => {
    // @ts-ignore
    analytics.sendEvent({
      action: 'AnalyticsEventActions.CLICK_EVENT',
      category: 'AnalyticsEventCategories.STAKING',
      name: popupView
        ? 'AnalyticsEventNames.Staking.STAKING_FAIL_POPUP'
        : 'AnalyticsEventNames.Staking.STAKING_FAIL_BROWSER',
    });
    setDelegationTxBuilder();
    portfolioMutators.executeCommand({ type: 'CancelDrawer' });
  };

  return (
    <div className={styles.footerFail}>
      <Button
        onClick={() => closeDrawer()}
        color="secondary"
        className={styles.btn}
        size="large"
        data-testid="staking-fail-close-button"
      >
        {t('drawer.failure.button.cancel')}
      </Button>
      <Button
        onClick={() => portfolioMutators.executeCommand({ type: 'DrawerBack' })}
        color="primary"
        className={styles.btn}
        size="large"
      >
        {t('drawer.failure.button.removePools')}
      </Button>
    </div>
  );
};
