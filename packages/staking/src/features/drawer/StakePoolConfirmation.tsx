/* eslint-disable react/no-multi-comp */
import Icon from '@ant-design/icons';
import { InputSelectionFailure } from '@cardano-sdk/input-selection';
import { BigIntMath } from '@cardano-sdk/util';
import { Wallet } from '@lace/cardano';
import { Banner, Button, Ellipsis, useObservable } from '@lace/common';
import { RowContainer, renderAmountInfo, renderLabel } from '@lace/core';
import { Skeleton } from 'antd';
import cn from 'classnames';
import isNil from 'lodash/isNil';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Balance, CurrencyInfo, useOutsideHandles } from '../outside-handles-provider';
import {
  DraftPortfolioStakePool,
  Sections,
  StakingError,
  sectionsConfig,
  useDelegationPortfolioStore,
  useStakePoolDetails,
} from '../store';
import ArrowDown from './arrow-down.svg';
import Cardano from './cardano-blue.png';
import ExclamationMarkIcon from './exclamation-circle-small.svg';
import styles from './StakePoolConfirmation.module.scss';

type statRendererProps = {
  img?: string;
  text: string;
  subText: React.ReactNode;
};

type StakePoolConfirmationProps = {
  popupView?: boolean;
};

const ERROR_MESSAGES: { [key: string]: StakingError } = {
  [InputSelectionFailure.UtxoFullyDepleted]: StakingError.UTXO_FULLY_DEPLETED,
  [InputSelectionFailure.UtxoBalanceInsufficient]: StakingError.UTXO_BALANCE_INSUFFICIENT,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isInputSelectionError = (error: any): error is { failure: InputSelectionFailure } =>
  typeof error === 'object' &&
  Object.hasOwn(error, 'failure') &&
  Object.values(InputSelectionFailure).includes(error.failure);

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

interface StakePoolConfirmationBodyProps {
  balance: Balance;
  cardanoCoin: Wallet.CoinId;
  fiatCurrency: CurrencyInfo;
  stakePools: DraftPortfolioStakePool[];
}

const StakePoolConfirmationBody = ({
  balance,
  cardanoCoin,
  fiatCurrency,
  stakePools,
}: StakePoolConfirmationBodyProps) => {
  const { t } = useTranslation();

  return (
    <div className={styles.body}>
      <div className={styles.item} data-testid="sp-confirmation-delegate-from-container">
        <ItemStatRenderer img={Cardano} text={t('drawer.confirmation.cardanoName')} subText={cardanoCoin.symbol} />
        <ItemStatRenderer
          text={balance?.total?.coinBalance}
          subText={`${balance?.total?.fiatBalance ?? '-'} ${fiatCurrency?.code}`}
        />
      </div>
      <Icon style={{ color: '#702BED', fontSize: '24px', margin: '12px 0px' }} component={ArrowDown} />
      {stakePools.map((stakePool) => (
        <div
          key={stakePool.id}
          className={cn(styles.item, styles.itemMulti)}
          data-testid="sp-confirmation-delegate-to-container"
        >
          <ItemStatRenderer
            img={stakePool.displayData.logo}
            text={stakePool.name || '-'}
            subText={<span>{stakePool.ticker}</span>}
          />
          <div className={styles.itemData}>
            <Ellipsis beforeEllipsis={10} afterEllipsis={8} text={stakePool.id} ellipsisInTheMiddle />
          </div>
        </div>
      ))}
    </div>
  );
};

export const StakePoolConfirmation = (): React.ReactElement => {
  const { t } = useTranslation();
  const { setIsBuildingTx, setStakingError, stakingError } = useStakePoolDetails();
  const {
    balancesBalance: balance,
    walletStoreInMemoryWallet: inMemoryWallet,
    walletStoreWalletUICardanoCoin: cardanoCoin,
    fetchCoinPricePriceResult: priceResult,
    delegationStoreDelegationTxFee: delegationTxFee = '0',
    delegationStoreSelectedStakePool: openPool,
    currencyStoreFiatCurrency: fiatCurrency,
    delegationStoreSetDelegationTxBuilder: setDelegationTxBuilder,
    delegationStoreSetDelegationTxFee: setDelegationTxFee,
  } = useOutsideHandles();
  const draftPortfolio = useDelegationPortfolioStore((store) => store.draftPortfolio);
  const [delegationTxDeposit, setDelegationTxDeposit] = useState(0);
  const protocolParameters = useObservable(inMemoryWallet.protocolParameters$);
  const loading = isNil(inMemoryWallet.protocolParameters$) || isNil(inMemoryWallet.delegation.rewardAccounts$);

  useEffect(() => {
    (async () => {
      if (draftPortfolio.length === 0 || loading) return;
      // TODO: move below logic to zustand store
      try {
        setIsBuildingTx(true);
        const txBuilder = inMemoryWallet.createTxBuilder();
        const pools = draftPortfolio.map((pool) => ({ id: pool.id, weight: pool.weight }));
        const tx = await txBuilder.delegatePortfolio({ pools }).build().inspect();
        const { deposit: newDelegationTxDeposit, input } = Wallet.Cardano.util.computeImplicitCoin(
          protocolParameters,
          tx.body
        );
        const newDelegationTxReclaim =
          (input || BigInt(0)) - BigIntMath.sum((tx.body.withdrawals || []).map(({ quantity }) => quantity));
        setDelegationTxBuilder(txBuilder);
        setDelegationTxFee(tx.body.fee.toString());
        setStakingError();
        setDelegationTxDeposit(Number(newDelegationTxDeposit) - Number(newDelegationTxReclaim));
      } catch (error) {
        // TODO: check for error instance after LW-6749
        if (isInputSelectionError(error)) {
          setStakingError(ERROR_MESSAGES[error.failure]);
        }
      } finally {
        setIsBuildingTx(false);
      }
    })();
  }, [
    draftPortfolio,
    inMemoryWallet,
    openPool,
    setDelegationTxBuilder,
    setDelegationTxFee,
    setIsBuildingTx,
    setStakingError,
    setDelegationTxDeposit,
    protocolParameters,
    loading,
  ]);

  const ErrorMessages: Record<StakingError, string> = {
    [StakingError.UTXO_FULLY_DEPLETED]: t('drawer.confirmation.errors.utxoFullyDepleted'),
    [StakingError.UTXO_BALANCE_INSUFFICIENT]: t('drawer.confirmation.errors.utxoBalanceInsufficient'),
  };

  return (
    <>
      <div className={styles.header}>
        <div data-testid="staking-confirmation-title" className={styles.title}>
          {t('drawer.confirmation.title')}
        </div>
        <div data-testid="staking-confirmation-subtitle" className={styles.subTitle}>
          {t('drawer.confirmation.subTitle')}
        </div>
      </div>
      {stakingError && (
        <div>
          <Banner customIcon={<ExclamationMarkIcon />} withIcon message={ErrorMessages[stakingError]} />
        </div>
      )}
      <div className={styles.container} data-testid="sp-confirmation-container">
        <Skeleton loading={loading}>
          <StakePoolConfirmationBody
            stakePools={draftPortfolio}
            balance={balance}
            cardanoCoin={cardanoCoin}
            fiatCurrency={fiatCurrency}
          />
          <h1 className={styles.totalCostTitle} data-testid="transaction-cost-title">
            {t('drawer.confirmation.totalCost.title')}
          </h1>
          <div className={styles.txCostContainer} data-testid="summary-fee-container">
            {delegationTxDeposit > 0 && (
              <RowContainer>
                {renderLabel({
                  dataTestId: 'sp-confirmation-staking-deposit',
                  label: t('drawer.confirmation.stakingDeposit'),
                  tooltipContent: t('drawer.confirmation.theAmountYoullBeChargedForRegisteringYourStakeKey'),
                })}
                <div>
                  {renderAmountInfo(
                    `${Wallet.util.lovelacesToAdaString(delegationTxDeposit.toString())} ${cardanoCoin.symbol}`,
                    `${Wallet.util.convertAdaToFiat({
                      ada: Wallet.util.lovelacesToAdaString(delegationTxDeposit.toString()),
                      fiat: priceResult?.cardano?.price || 0,
                    })} ${fiatCurrency?.symbol}`
                  )}
                </div>
              </RowContainer>
            )}

            <RowContainer>
              {renderLabel({
                dataTestId: 'sp-confirmation-staking-fee',
                label: t('drawer.confirmation.transactionFee'),
                tooltipContent: t('drawer.confirmation.theAmountYoullBeChargedToProcessYourTransaction'),
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
  const { t } = useTranslation();
  const {
    walletStoreInMemoryWallet: inMemoryWallet,
    walletStoreGetKeyAgentType: getKeyAgentType,
    submittingState: { setIsRestaking },
    delegationStoreDelegationTxBuilder: delegationTxBuilder,
  } = useOutsideHandles();
  const { isBuildingTx, stakingError } = useStakePoolDetails();
  const [isConfirmingTx, setIsConfirmingTx] = useState(false);
  const currentPortfolio = useDelegationPortfolioStore((store) => store.currentPortfolio);

  const keyAgentType = getKeyAgentType();
  const isInMemory = useMemo(() => keyAgentType === Wallet.KeyManagement.KeyAgentType.InMemory, [keyAgentType]);

  const { setSection } = useStakePoolDetails();

  // TODO unify
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
        setIsRestaking(currentPortfolio.length > 0);
        return setSection(sectionsConfig[Sections.SUCCESS_TX]);
      } catch {
        return setSection(sectionsConfig[Sections.FAIL_TX]);
      } finally {
        setIsConfirmingTx(false);
      }
    }
    return setSection(sectionsConfig[Sections.SIGN]);
  }, [isInMemory, setSection, signAndSubmitTransaction, setIsRestaking, currentPortfolio.length]);

  const confirmLabel = useMemo(() => {
    if (!isInMemory) {
      const staleLabels = popupView
        ? t('drawer.confirmation.button.continueInAdvancedView')
        : t('drawer.confirmation.button.confirmWithDevice', { hardwareWallet: keyAgentType });
      return isConfirmingTx ? t('drawer.confirmation.button.signing') : staleLabels;
    }
    return t('drawer.confirmation.button.confirm');
  }, [isConfirmingTx, isInMemory, keyAgentType, popupView, t]);

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
