/* eslint-disable complexity */
/* eslint-disable react/no-multi-comp */
/* eslint-disable unicorn/no-nested-ternary */
import Icon from '@ant-design/icons';
import { Wallet } from '@lace/cardano';
import { Banner, Button, Ellipsis, useObservable } from '@lace/common';
import { RowContainer, renderAmountInfo, renderLabel } from '@lace/core';
import { useCurrencyStore } from '@providers';
import ExclamationMarkIcon from '@src/assets/icons/exclamation-circle-small.svg';
import { useBuildDelegation } from '@src/hooks';
import { Skeleton } from 'antd';
import isNil from 'lodash/isNil';
import React, { useCallback, useMemo, useState } from 'react';
// import { useTranslation } from 'react-i18next';
import ArrowDown from '../../../../../../assets/icons/arrow-down.component.svg';
import Cardano from '../../../../../../assets/images/cardano-blue-bg.png';
import { useOutsideHandles } from '../outside-handles-provider';
import { SelectedStakePoolDetails } from '../outside-handles-provider/types';
import { Sections, StakingError, sectionsConfig, useStakePoolDetails } from '../store';
import styles from './StakePoolConfirmation.module.scss';

type statRendererProps = {
  img?: string;
  text: string;
  subText: React.ReactNode;
};

type StakePoolConfirmationProps = {
  popupView?: boolean;
};

export const StakePoolConfirmation = (): React.ReactElement => {
  // const { t } = useTranslation();
  const { stakingError } = useStakePoolDetails();
  const {
    balancesBalance: balance,
    walletStoreInMemoryWallet: inMemoryWallet,
    walletStoreWalletUICardanoCoin: cardanoCoin,
    fetchCoinPricePriceResult: priceResult,
    delegationStoreDelegationTxFee: delegationTxFee = '0',
    delegationStoreSelectedStakePoolDetails: {
      logo: poolLogo,
      id: poolId,
      ticker: poolTicker,
      name: poolName,
    } = {} as SelectedStakePoolDetails,
  } = useOutsideHandles();

  useBuildDelegation();

  const { fiatCurrency } = useCurrencyStore();

  const stakePoolName = poolName ?? '-';
  const protocolParameters = useObservable(inMemoryWallet?.protocolParameters$);
  const rewardAccounts = useObservable(inMemoryWallet.delegation.rewardAccounts$);
  const deposit =
    rewardAccounts && rewardAccounts[0]?.keyStatus !== Wallet.Cardano.StakeKeyStatus.Registered
      ? protocolParameters?.stakeKeyDeposit
      : undefined;

  const ErrorMessages: Record<StakingError, string> = {
    [StakingError.UTXO_FULLY_DEPLETED]: "t('browserView.staking.details.errors.utxoFullyDepleted')",
    [StakingError.UTXO_BALANCE_INSUFFICIENT]: "t('browserView.staking.details.errors.utxoBalanceInsufficient')",
  };

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
  const stakePoolAddress = <Ellipsis beforeEllipsis={10} afterEllipsis={8} text={poolId} ellipsisInTheMiddle />;

  return (
    <>
      <div className={styles.header}>
        <div data-testid="staking-confirmation-title" className={styles.title}>
          {"t('browserView.staking.details.confirmation.title')"}
        </div>
        <div data-testid="staking-confirmation-subtitle" className={styles.subTitle}>
          {"t('browserView.staking.details.confirmation.subTitle')"}
        </div>
      </div>
      {stakingError && (
        <div>
          <Banner customIcon={<ExclamationMarkIcon />} withIcon message={ErrorMessages[stakingError]} />
        </div>
      )}
      <div className={styles.container} data-testid="sp-confirmation-container">
        <Skeleton loading={loading}>
          <div className={styles.body}>
            <div className={styles.item} data-testid="sp-confirmation-delegate-from-container">
              <ItemStatRenderer
                img={Cardano}
                text={"t('browserView.staking.details.confirmation.cardanoName')"}
                subText={cardanoCoin.symbol}
              />
              <ItemStatRenderer
                text={balance?.total?.coinBalance}
                subText={`${balance?.total?.fiatBalance ?? '-'} ${fiatCurrency?.code}`}
              />
            </div>
            <Icon style={{ color: '#702BED', fontSize: '24px', margin: '12px 0px' }} component={ArrowDown} />
            <div className={styles.item} data-testid="sp-confirmation-delegate-to-container">
              <ItemStatRenderer img={poolLogo} text={stakePoolName} subText={<span>{poolTicker}</span>} />
              <div className={styles.itemData}>{stakePoolAddress}</div>
            </div>
          </div>

          <h1 className={styles.totalCostTitle}>{"t('browserView.staking.details.confirmation.totalCost.title')"}</h1>
          <div className={styles.txCostContainer} data-testid="summary-fee-container">
            {deposit && (
              <RowContainer>
                {renderLabel({
                  dataTestId: 'sp-confirmation-staking-deposit',
                  label: "t('staking.confirmation.stakingDeposit')",
                  tooltipContent: "t('staking.confirmation.theAmountYoullBeChargedForRegisteringYourStakeKey')",
                })}
                <div>
                  {renderAmountInfo(
                    `${Wallet.util.lovelacesToAdaString(deposit.toString())} ${cardanoCoin.symbol}`,
                    `${Wallet.util.convertAdaToFiat({
                      ada: Wallet.util.lovelacesToAdaString(deposit.toString()),
                      fiat: priceResult?.cardano?.price || 0,
                    })} ${fiatCurrency?.symbol}`
                  )}
                </div>
              </RowContainer>
            )}

            <RowContainer>
              {renderLabel({
                dataTestId: 'sp-confirmation-staking-fee',
                label: "t('staking.confirmation.transactionFee')",
                tooltipContent: "t('send.theAmountYoullBeChargedToProcessYourTransaction')",
              })}
              <div>
                {renderAmountInfo(
                  `${Wallet.util.lovelacesToAdaString(delegationTxFee)} ${cardanoCoin.symbol}`,
                  `${Wallet.util.convertAdaToFiat({
                    ada: Wallet.util.lovelacesToAdaString(delegationTxFee),
                    fiat: priceResult?.cardano?.price || 0,
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
  // const { t } = useTranslation();
  const {
    walletStoreInMemoryWallet: inMemoryWallet,
    walletStoreGetKeyAgentType: getKeyAgentType,
    submittingStateSetIsRestaking: setIsRestaking,
    delegationStoreDelegationTxBuilder: delegationTxBuilder,
    delegationDetails,
  } = useOutsideHandles();
  const { isBuildingTx, stakingError } = useStakePoolDetails();
  const [isConfirmingTx, setIsConfirmingTx] = useState(false);

  const rewardAccounts = useObservable(inMemoryWallet.delegation.rewardAccounts$);

  const keyAgentType = getKeyAgentType();
  const isInMemory = useMemo(() => keyAgentType === Wallet.KeyManagement.KeyAgentType.InMemory, [keyAgentType]);

  const { setSection } = useStakePoolDetails();

  const signAndSubmitTransaction = useCallback(async () => {
    if (!delegationTxBuilder) throw new Error('Unable to submit transaction. The delegationTxBuilder not available');
    const signedTx = await delegationTxBuilder.build().sign();
    await inMemoryWallet.submitTx(signedTx.tx);
  }, [delegationTxBuilder, inMemoryWallet]);

  const handleConfirmation = useCallback(async () => {
    setIsConfirmingTx(false);
    if (!isInMemory) {
      setIsConfirmingTx(true);
      try {
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
  }, [isInMemory, setSection, signAndSubmitTransaction, setIsRestaking, rewardAccounts, delegationDetails]);

  const confirmLabel = useMemo(() => {
    if (!isInMemory) {
      const staleLabels = popupView
        ? "t('browserView.staking.details.confirmation.button.continueInAdvancedView')"
        : "t('browserView.staking.details.confirmation.button.confirmWithDevice', { hardwareWallet: keyAgentType })";
      return isConfirmingTx ? "t('browserView.staking.details.confirmation.button.signing')" : staleLabels;
    }
    return popupView
      ? "t('staking.details.confirmation.button.confirm')"
      : "t('browserView.staking.details.confirmation.button.confirm')";
  }, [isConfirmingTx, isInMemory, popupView]);

  return (
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
  );
};
