/* eslint-disable react/no-multi-comp */
import { Button } from '@lace/common';
import cn from 'classnames';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useOutsideHandles } from '../outside-handles-provider';
import { useDelegationPortfolioStore } from '../store';
import { ResultMessage } from './ResultMessage';
import styles from './TransactionComplete.module.scss';

type TransactionFailProps = {
  popupView?: boolean;
};

export const TransactionFail = ({ popupView }: TransactionFailProps): React.ReactElement => {
  const { t } = useTranslation();

  return (
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    <div className={cn(styles.container, styles.fail, { [styles.popupView!]: popupView })}>
      <div className={styles.containerFail}>
        <ResultMessage status="error" title={t('drawer.failure.title')} description={t('drawer.failure.subTitle')} />
      </div>
    </div>
  );
};

export const TransactionFailFooter = ({ popupView }: TransactionFailProps): React.ReactElement => {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const {
    walletManagerExecuteWithPassword: executeWithPassword,
    password: { password, removePassword },
  } = useOutsideHandles();
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
    // setDelegationTxBuilder(); // TODO: reset tx state
    portfolioMutators.executeCommand({ type: 'CancelDrawer' });
  };

  // TODO: handle loading, password removal
  const onSubmit = async () => {
    setIsLoading(true);
    try {
      portfolioMutators.executeCommand({ type: 'SignSubmitTx' });
      setIsLoading(false);
      portfolioMutators.executeCommand({ type: 'DrawerContinue' });
      removePassword();
    } catch (error) {
      console.error('failed to sign or submit tx due to:', error);
      setIsLoading(false);
    }
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
        {t('drawer.failure.button.close')}
      </Button>
      {popupView ? (
        <Button
          onClick={() => portfolioMutators.executeCommand({ type: 'DrawerBack' })}
          color="primary"
          className={styles.btn}
          size="large"
        >
          {t('drawer.failure.button.back')}
        </Button>
      ) : (
        <Button
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          onClick={() => executeWithPassword(password!, onSubmit)}
          className={styles.btn}
          size="large"
          loading={isLoading}
          disabled={isLoading}
          data-testid="staking-fail-retry-button"
        >
          {t('drawer.failure.button.retry')}
        </Button>
      )}
    </div>
  );
};
