/* eslint-disable react/no-multi-comp */
import { WalletType } from '@cardano-sdk/web-extension';
import { Button, PostHogAction } from '@lace/common';
import cn from 'classnames';
import React, { useEffect, useMemo } from 'react';
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
    isSharedWallet,
  } = useOutsideHandles();
  const draftPortfolio = useDelegationPortfolioStore((store) => store.draftPortfolio);

  const { title, description } = useMemo(() => {
    if (isSharedWallet) {
      return {
        description: t('drawer.success.sign.subTitle'),
        title: t('drawer.success.sign.title'),
      };
    }
    // un-delegation case
    if (draftPortfolio?.length === 0) {
      return {
        title: t('drawer.success.modification.title'),
      };
    }
    if (isRestaking) {
      return {
        description: t('drawer.success.switchedPools.subTitle'),
        title: t('drawer.success.switchedPools.title'),
      };
    }

    return {
      description: t('drawer.success.subTitle'),
      title: t('drawer.success.title'),
    };
  }, [draftPortfolio, isRestaking, isSharedWallet, t]);

  useEffect(() => {
    analytics.sendEventToPostHog(PostHogAction.StakingManageDelegationHurrayView);
  }, [analytics]);

  return (
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    <div className={cn(styles.container, { [styles.popupView!]: popupView })}>
      <ResultMessage title={title} description={description} />
    </div>
  );
};

export const TransactionSuccessFooter = (): React.ReactElement => {
  const { t } = useTranslation();
  const {
    analytics,
    delegationStoreSetDelegationTxBuilder: setDelegationTxBuilder,
    walletStoreWalletType: walletType,
    isSharedWallet,
  } = useOutsideHandles();
  const { portfolioMutators } = useDelegationPortfolioStore((store) => ({
    portfolioMutators: store.mutators,
  }));
  const isInMemory = walletType === WalletType.InMemory;

  const closeDrawer = () => {
    // TODO: open view cosigner drawer which is available only in the activities tab
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
        {isSharedWallet ? t('general.button.view-co-signers') : t('general.button.close')}
      </Button>
    </div>
  );
};
