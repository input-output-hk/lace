/* eslint-disable react/no-multi-comp */
import { WalletType } from '@cardano-sdk/web-extension';
import { Button, PostHogAction } from '@lace/common';
import cn from 'classnames';
import React, { useEffect } from 'react';
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
  const {
    submittingState: { isRestaking },
    analytics,
  } = useOutsideHandles();

  useEffect(() => {
    analytics.sendEventToPostHog(PostHogAction.StakingManageDelegationHurrayView);
  }, [analytics]);

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

export const TransactionSuccessFooter = (): React.ReactElement => {
  const { t } = useTranslation();
  const {
    analytics,
    delegationStoreSetDelegationTxBuilder: setDelegationTxBuilder,
    walletStoreGetWalletType: getWalletType,
  } = useOutsideHandles();
  const { portfolioMutators } = useDelegationPortfolioStore((store) => ({
    portfolioMutators: store.mutators,
  }));
  const isInMemory = getWalletType() === WalletType.InMemory;

  const closeDrawer = () => {
    analytics.sendEventToPostHog(PostHogAction.StakingManageDelegationHurrayCloseClick);
    setDelegationTxBuilder();
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
