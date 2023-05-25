/* eslint-disable complexity */
/* eslint-disable react/no-multi-comp */
/* eslint-disable unicorn/no-nested-ternary */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import cn from 'classnames';
import isNil from 'lodash/isNil';
import { Skeleton } from 'antd';
import Icon from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { Wallet } from '@lace/cardano';
import { Button, Ellipsis } from '@lace/common';
import { RowContainer, renderLabel, renderAmountInfo } from '@lace/core';
import { useBalances, useBuildDelegation, useDelegationDetails, useFetchCoinPrice, useObservable } from '@src/hooks';
import { useWalletStore } from '@stores';
import { stakePoolDetailsSelector, useDelegationStore } from '@src/features/delegation/stores';
import { sectionsConfig, useStakePoolDetails } from '../../store';
import Cardano from '../../../../../../assets/images/cardano-blue-bg.png';
import styles from './StakePoolConfirmation.module.scss';
import ArrowDown from '../../../../../../assets/icons/arrow-down.component.svg';
import { Sections, StakingError } from '@views/browser/features/staking/types';
import { useDelegationTransaction } from '@views/browser/features/staking/hooks';
import { BrowserViewSections } from '@lib/scripts/types';
import { ContinueInBrowserDialog } from '@components/ContinueInBrowserDialog';
import { useBackgroundServiceAPIContext } from '@providers/BackgroundServiceAPI';
import { Banner } from '@components/Banner';
import ExclamationMarkIcon from '@src/assets/icons/exclamation-circle-small.svg';
import {
  AnalyticsEventActions,
  AnalyticsEventCategories,
  AnalyticsEventNames
} from '@providers/AnalyticsProvider/analyticsTracker';
import { useAnalyticsContext, useCurrencyStore } from '@providers';
import { useSubmitingState } from '@views/browser/features/send-transaction';

type statRendererProps = {
  img?: string;
  text: string;
  subText: React.ReactNode;
};

type StakePoolConfirmationProps = {
  popupView?: boolean;
};

interface OpenTabStakingProps {
  poolId: string;
}

export const StakePoolConfirmation = ({ popupView }: StakePoolConfirmationProps): React.ReactElement => {
  const { t } = useTranslation();
  const { setIsBuildingTx, setStakingError, stakingError } = useStakePoolDetails();
  const {
    inMemoryWallet,
    walletUI: { cardanoCoin }
  } = useWalletStore();
  const { priceResult } = useFetchCoinPrice();
  const { balance } = useBalances(priceResult?.cardano?.price);

  const buildDelegationTx = useBuildDelegation();
  const { setDelegationBuiltTx, delegationBuiltTx } = useDelegationStore();
  const {
    logo: poolLogo,
    id: poolId,
    ticker: poolTicker,
    name: poolName
  } = useDelegationStore(stakePoolDetailsSelector) || {};
  const { fiatCurrency } = useCurrencyStore();

  const stakePoolName = useMemo(() => (poolName ? poolName : popupView ? '-' : poolName), [poolName, popupView]);
  const protocolParameters = useObservable(inMemoryWallet?.protocolParameters$);
  const rewardAccounts = useObservable(inMemoryWallet.delegation.rewardAccounts$);
  const deposit =
    rewardAccounts && rewardAccounts[0]?.keyStatus !== Wallet.Cardano.StakeKeyStatus.Registered
      ? protocolParameters?.stakeKeyDeposit
      : undefined;
  const fee = delegationBuiltTx ? delegationBuiltTx?.body?.fee : 0;

  const buildTransaction = useCallback(async () => {
    try {
      setIsBuildingTx(true);
      const builtTx = await buildDelegationTx();
      setDelegationBuiltTx(builtTx);
      // eslint-disable-next-line unicorn/no-useless-undefined
      setStakingError(undefined);
    } catch (error) {
      console.error(error);
      if (error?.failure === 'UTxO Fully Depleted') {
        setStakingError(StakingError.UTXO_FULLY_DEPLETED);
      } else if (error?.failure === 'UTxO Balance Insufficient') {
        setStakingError(StakingError.UTXO_BALANCE_INSUFFICIENT);
      }
    } finally {
      setIsBuildingTx(false);
    }
  }, [buildDelegationTx, setDelegationBuiltTx, setIsBuildingTx, setStakingError]);

  const ErrorMessages = {
    [StakingError.UTXO_FULLY_DEPLETED]: t('browserView.staking.details.errors.utxoFullyDepleted'),
    [StakingError.UTXO_BALANCE_INSUFFICIENT]: t('browserView.staking.details.errors.utxoBalanceInsufficient')
  };

  useEffect(() => {
    if (!delegationBuiltTx) {
      buildTransaction();
    }
  }, [delegationBuiltTx, buildTransaction]);

  const ItemStatRenderer = ({ img, text, subText }: statRendererProps) => (
    <div>
      {img && <img data-testid="sp-confirmation-item-logo" src={img} alt="confirmation item" />}
      <div className={styles.itemData}>
        <div className={styles.dataTitle} data-testid="sp-confirmation-item-text">
          {text}
        </div>
        <div className={styles.dataSubTitle} data-testid="sp-confirmation-item-subtext">
          {subText}
        </div>
      </div>
    </div>
  );

  const loading = isNil(inMemoryWallet.protocolParameters$) || isNil(inMemoryWallet.delegation.rewardAccounts$);
  const stakePoolAddress = (
    <Ellipsis beforeEllipsis={10} afterEllipsis={8} text={poolId} ellipsisInTheMiddle={!popupView} />
  );

  return (
    <>
      <div className={cn(styles.header, { [styles.popupView]: popupView })}>
        <div data-testid="staking-confirmation-title" className={styles.title}>
          {t('browserView.staking.details.confirmation.title')}
        </div>
        <div data-testid="staking-confirmation-subtitle" className={styles.subTitle}>
          {t('browserView.staking.details.confirmation.subTitle')}
        </div>
      </div>
      {stakingError && (
        <div>
          <Banner customIcon={ExclamationMarkIcon} withIcon message={ErrorMessages[stakingError]} />
        </div>
      )}
      <div className={cn(styles.container, { [styles.popupView]: popupView })} data-testid="sp-confirmation-container">
        <Skeleton loading={loading}>
          <div className={cn(styles.body, { [styles.popupView]: popupView })}>
            <div className={styles.item} data-testid="sp-confirmation-delegate-from-container">
              <ItemStatRenderer
                img={Cardano}
                text={t('browserView.staking.details.confirmation.cardanoName')}
                subText={cardanoCoin.symbol}
              />
              <ItemStatRenderer
                text={balance?.total?.coinBalance}
                subText={`${balance?.total?.fiatBalance} ${fiatCurrency?.code}`}
              />
            </div>
            <Icon
              style={{ fontSize: '24px', color: '#702BED', margin: popupView ? 'initial' : '12px 0px' }}
              component={ArrowDown}
            />
            <div className={styles.item} data-testid="sp-confirmation-delegate-to-container">
              <ItemStatRenderer
                img={poolLogo}
                text={stakePoolName}
                subText={
                  <>
                    <span>{poolTicker}</span>
                    {popupView && <span>{stakePoolAddress}</span>}
                  </>
                }
              />
              <div className={styles.itemData}>{!popupView ? stakePoolAddress : <></>}</div>
            </div>
          </div>

          {popupView && <div className={styles.divider} />}

          <h1 className={styles.totalCostTitle}>{t('browserView.staking.details.confirmation.totalCost.title')}</h1>
          <div className={styles.txCostContainer} data-testid="summary-fee-container">
            {deposit && (
              <RowContainer>
                {renderLabel({
                  label: t('staking.confirmation.stakingDeposit'),
                  dataTestId: 'sp-confirmation-staking-deposit',
                  tooltipContent: t('staking.confirmation.theAmountYoullBeChargedForRegisteringYourStakeKey')
                })}
                <div>
                  {renderAmountInfo(
                    `${Wallet.util.lovelacesToAdaString(deposit.toString())} ${cardanoCoin.symbol}`,
                    `${Wallet.util.convertAdaToFiat({
                      ada: Wallet.util.lovelacesToAdaString(deposit.toString()),
                      fiat: priceResult?.cardano?.price || 0
                    })} ${fiatCurrency?.symbol}`
                  )}
                </div>
              </RowContainer>
            )}

            <RowContainer>
              {renderLabel({
                label: t('staking.confirmation.transactionFee'),
                dataTestId: 'sp-confirmation-staking-fee',
                tooltipContent: t('send.theAmountYoullBeChargedToProcessYourTransaction')
              })}
              <div>
                {renderAmountInfo(
                  `${Wallet.util.lovelacesToAdaString(fee.toString())} ${cardanoCoin.symbol}`,
                  `${Wallet.util.convertAdaToFiat({
                    ada: Wallet.util.lovelacesToAdaString(fee.toString()),
                    fiat: priceResult?.cardano?.price || 0
                  })} ${fiatCurrency?.symbol}`
                )}
              </div>
            </RowContainer>
          </div>
        </Skeleton>
      </div>
    </>
  );
};

export const StakePoolConfirmationFooter = ({ popupView }: StakePoolConfirmationProps): React.ReactElement => {
  const { t } = useTranslation();
  const { isBuildingTx, stakingError } = useStakePoolDetails();
  const [isConfirmingTx, setIsConfirmingTx] = useState(false);
  const { getKeyAgentType, inMemoryWallet } = useWalletStore();
  const analytics = useAnalyticsContext();

  const { setIsRestaking } = useSubmitingState();
  const rewardAccounts = useObservable(inMemoryWallet.delegation.rewardAccounts$);
  const delegationDetails = useDelegationDetails();

  const [isContinueDialogVisible, setIsContinueDialogVisible] = useState(false);
  const toggleContinueDialog = useCallback(
    () => setIsContinueDialogVisible(!isContinueDialogVisible),
    [isContinueDialogVisible]
  );
  const backgroundServices = useBackgroundServiceAPIContext();

  const openTabStaking = useCallback(
    ({ poolId }: OpenTabStakingProps): Promise<void> => {
      // TODO: is there a better way to do this? [LW-5457]
      localStorage.setItem('TEMP_POOLID', poolId);
      return backgroundServices.handleOpenBrowser({ section: BrowserViewSections.STAKING });
    },
    [backgroundServices]
  );
  const keyAgentType = getKeyAgentType();
  const isInMemory = useMemo(() => keyAgentType === Wallet.KeyManagement.KeyAgentType.InMemory, [keyAgentType]);

  const { setSection } = useStakePoolDetails();
  const { id: poolId } = useDelegationStore(stakePoolDetailsSelector);

  const { signAndSubmitTransaction } = useDelegationTransaction();

  const sendAnalytics = useCallback(() => {
    analytics.sendEvent({
      category: AnalyticsEventCategories.STAKING,
      action: AnalyticsEventActions.CLICK_EVENT,
      name: popupView
        ? AnalyticsEventNames.Staking.STAKING_CONFIRMATION_POPUP
        : AnalyticsEventNames.Staking.STAKING_CONFIRMATION_BROWSER
    });
  }, [analytics, popupView]);

  const handleConfirmation = useCallback(async () => {
    sendAnalytics();
    setIsConfirmingTx(false);
    if (!isInMemory) {
      setIsConfirmingTx(true);
      try {
        if (popupView) return toggleContinueDialog();
        await signAndSubmitTransaction();
        const isDelegating = !!(rewardAccounts && delegationDetails);
        setIsRestaking(isDelegating);
        return setSection(sectionsConfig[Sections.SUCCESS_TX]);
      } catch {
        return setSection(sectionsConfig[Sections.FAIL_TX]);
      } finally {
        setIsConfirmingTx(false);
      }
    }
    return setSection(sectionsConfig[Sections.SIGN]);
  }, [
    sendAnalytics,
    isInMemory,
    setSection,
    popupView,
    toggleContinueDialog,
    signAndSubmitTransaction,
    setIsRestaking,
    rewardAccounts,
    delegationDetails
  ]);

  const confirmLabel = useMemo(() => {
    if (!isInMemory) {
      const staleLabels = popupView
        ? t('browserView.staking.details.confirmation.button.continueInAdvancedView')
        : t('browserView.staking.details.confirmation.button.confirmWithDevice', { hardwareWallet: keyAgentType });
      return isConfirmingTx ? t('browserView.staking.details.confirmation.button.signing') : staleLabels;
    }
    return popupView
      ? t('staking.details.confirmation.button.confirm')
      : t('browserView.staking.details.confirmation.button.confirm');
  }, [isConfirmingTx, isInMemory, t, popupView, keyAgentType]);

  return (
    <>
      <ContinueInBrowserDialog
        visible={isContinueDialogVisible}
        onConfirm={() => openTabStaking({ poolId })}
        onClose={toggleContinueDialog}
        title={t('browserView.onboarding.hardwareWalletStakingTransition.title')}
        description={t('browserView.onboarding.hardwareWalletStakingTransition.description')}
        okLabel={t('browserView.onboarding.hardwareWalletStakingTransition.ok')}
        cancelLabel={t('browserView.onboarding.hardwareWalletStakingTransition.cancel')}
      />
      <div className={cn({ [styles.popupView]: popupView })}>
        <div className={styles.actions}>
          <Button
            data-testid="stake-pool-confirmation-btn"
            disabled={isBuildingTx || !!stakingError}
            loading={isConfirmingTx || isBuildingTx}
            onClick={handleConfirmation}
            className={styles.confirmBtn}
            size="large"
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </>
  );
};
