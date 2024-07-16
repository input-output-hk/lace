/* eslint-disable react/no-multi-comp */
import { WalletType } from '@cardano-sdk/web-extension';
import { Box } from '@input-output-hk/lace-ui-toolkit';
import { Button, WarningBanner } from '@lace/common';
import cn from 'classnames';
import React, { useCallback, useState } from 'react';
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
  const { isCustomSubmitApiEnabled } = useOutsideHandles();

  return (
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    <div className={cn(styles.container, styles.fail, { [styles.popupView!]: popupView })}>
      <div className={styles.containerFail}>
        <ResultMessage
          status="error"
          title={t('drawer.failure.title')}
          description={
            <>
              <div>{t('drawer.failure.subTitle')}</div>
              {isCustomSubmitApiEnabled && (
                <Box mt="$32">
                  <WarningBanner message={t('drawer.failure.customSubmitApiWarning')} />
                </Box>
              )}
            </>
          }
        />
      </div>
    </div>
  );
};

export const TransactionFailFooter = ({ popupView }: TransactionFailProps): React.ReactElement => {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const {
    delegationStoreSetDelegationTxBuilder: setDelegationTxBuilder,
    walletStoreWalletType: walletType,
    delegationStoreDelegationTxBuilder: delegationTxBuilder,
    password: { password, removePassword },
    walletStoreInMemoryWallet: inMemoryWallet,
    walletManagerExecuteWithPassword: executeWithPassword,
    isMultidelegationSupportedByDevice,
  } = useOutsideHandles();
  // TODO implement analytics for the new flow
  const analytics = {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    sendEvent: () => {},
  };
  const { portfolioMutators, draftPortfolio } = useDelegationPortfolioStore((store) => ({
    draftPortfolio: store.draftPortfolio,
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

  const isInMemory = walletType === WalletType.InMemory;

  // TODO unify
  const signAndSubmitTransaction = useCallback(async () => {
    if (!delegationTxBuilder) throw new Error('Unable to submit transaction. The delegationTxBuilder not available');

    const isMultidelegation = draftPortfolio && draftPortfolio.length > 1;
    if (!isInMemory && isMultidelegation) {
      const isSupported = await isMultidelegationSupportedByDevice(walletType);
      if (!isSupported) {
        throw new Error('MULTIDELEGATION_NOT_SUPPORTED');
      }
    }
    const signedTx = await delegationTxBuilder.build().sign();
    await inMemoryWallet.submitTx(signedTx);
  }, [delegationTxBuilder, draftPortfolio, inMemoryWallet, isInMemory, isMultidelegationSupportedByDevice, walletType]);

  const onSubmit = async () => {
    setIsLoading(true);

    try {
      await signAndSubmitTransaction();
      setIsLoading(false);
      portfolioMutators.executeCommand({ type: 'DrawerContinue' });
      removePassword();
    } catch (error: unknown) {
      console.error('failed to sign or submit tx due to:', error);
      setIsLoading(false);

      if (error instanceof Error && error.message === 'MULTIDELEGATION_NOT_SUPPORTED') {
        portfolioMutators.executeCommand({ type: 'HwSkipToDeviceFailure' });
      }
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
          // password defined only for inMemory wallet
          onClick={() => executeWithPassword(onSubmit, password)}
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
