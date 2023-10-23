/* eslint-disable react/no-multi-comp */
import { Wallet } from '@lace/cardano';
import { Button } from '@lace/common';
import cn from 'classnames';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useOutsideHandles } from '../outside-handles-provider';
import { useDelegationPortfolioStore } from '../store';
import { ResultMessage } from './ResultMessage';
import styles from './TransactionComplete.module.scss';

type TransactionSuccessProps = {
  popupView?: boolean;
};

export const TransactionSuccess = ({ popupView }: TransactionSuccessProps): React.ReactElement => {
  const { t } = useTranslation();
  const { isRestaking } = useDelegationPortfolioStore((store) => ({
    isRestaking: store.transaction?.isRestaking,
  }));

  return (
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    <div className={cn(styles.container, { [styles.popupView!]: popupView })}>
      <ResultMessage
        title={isRestaking ? t('drawer.success.switchedPools.title') : t('drawer.success.title')}
        description={isRestaking ? t('drawer.success.switchedPools.subTitle') : t('drawer.success.subTitle')}
      />
    </div>
  );
};

export const TransactionSuccessFooter = ({ popupView }: TransactionSuccessProps): React.ReactElement => {
  const { t } = useTranslation();
  const { walletStoreGetKeyAgentType: getKeyAgentType } = useOutsideHandles();
  // TODO implement analytics for the new flow
  const analytics = {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    sendEvent: () => {},
  };
  const { portfolioMutators } = useDelegationPortfolioStore((store) => ({
    portfolioMutators: store.mutators,
  }));
  const isInMemory = useMemo(() => getKeyAgentType() === Wallet.KeyManagement.KeyAgentType.InMemory, [getKeyAgentType]);

  const closeDrawer = () => {
    // @ts-ignore
    analytics.sendEvent({
      action: 'AnalyticsEventActions.CLICK_EVENT',
      category: 'AnalyticsEventCategories.STAKING',
      name: popupView
        ? 'AnalyticsEventNames.Staking.STAKING_SUCCESS_POPUP'
        : 'AnalyticsEventNames.Staking.STAKING_SUCCESS_BROWSER',
    });
    // setDelegationTxBuilder(); // TODO: reset tx state
    portfolioMutators.executeCommand({ type: 'CancelDrawer' });
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
