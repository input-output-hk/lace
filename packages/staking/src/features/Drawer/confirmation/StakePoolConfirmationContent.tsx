/* eslint-disable complexity */
import { InputSelectionFailure } from '@cardano-sdk/input-selection';
import { DeRegistrationsWithRewardsLocked, TxBuilder } from '@cardano-sdk/tx-construction';
import { Box, SummaryExpander, TransactionSummary } from '@input-output-hk/lace-ui-toolkit';
import { Wallet } from '@lace/cardano';
import { Banner, useObservable } from '@lace/common';
import { CoSignersListItem, CosignersList, InfoBar, RowContainer, renderLabel } from '@lace/core';
import { Skeleton } from 'antd';
import isNil from 'lodash/isNil';
import React, { ReactElement, useCallback, useEffect, useMemo, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useOutsideHandles } from '../../outside-handles-provider';
import { StakingError, StakingErrorType, useDelegationPortfolioStore, useStakingStore } from '../../store';
import { AmountInfo } from './AmountInfo';
import ExclamationMarkIcon from './exclamation-circle-small.svg';
import { LockedStakeKeysList } from './LockedStakeKeysList';
import { StakePoolConfirmationBody } from './StakePoolConfirmationBody';
import styles from './StakePoolConfirmationContent.module.scss';
import { StakePoolDepositReclaimDetails } from './StakePoolDepositReclaimDetails';

const SHARED_WALLET_TX_VALIDITY_INTERVAL = process.env.SHARED_WALLET_TX_VALIDITY_INTERVAL;

const ERROR_MESSAGES = {
  [InputSelectionFailure.UtxoFullyDepleted]: StakingErrorType.UTXO_FULLY_DEPLETED,
  [InputSelectionFailure.UtxoBalanceInsufficient]: StakingErrorType.UTXO_BALANCE_INSUFFICIENT,
} as const;

const isDeRegistrationsWithRewardsLockedError = (error: unknown): error is DeRegistrationsWithRewardsLocked =>
  !!error && typeof error === 'object' && 'name' in error && error.name === DeRegistrationsWithRewardsLocked.name;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isInputSelectionError = (error: any): error is { failure: InputSelectionFailure } =>
  typeof error === 'object' &&
  Object.hasOwn(error, 'failure') &&
  Object.values(InputSelectionFailure).includes(error.failure);

export const StakePoolConfirmationContent = (): React.ReactElement => {
  const { t } = useTranslation();
  const { setIsBuildingTx, setStakingError, stakingError } = useStakingStore();
  const {
    balancesBalance: balance,
    walletStoreInMemoryWallet: inMemoryWallet,
    walletStoreWalletUICardanoCoin: cardanoCoin,
    fetchCoinPricePriceResult: priceResult,
    delegationStoreDelegationTxFee: delegationTxFee = '0',
    currencyStoreFiatCurrency: fiatCurrency,
    delegationStoreSetDelegationTxBuilder: setDelegationTxBuilder,
    delegationStoreSetDelegationTxFee: setDelegationTxFee,
    isSharedWallet,
    signPolicy,
    sharedWalletKey,
    coSigners,
    govToolUrl,
    openExternalLink,
  } = useOutsideHandles();
  const { draftPortfolio } = useDelegationPortfolioStore((store) => ({
    draftPortfolio: store.draftPortfolio || [],
  }));

  const [isCosignersOpen, setIsCosignersOpen] = useState(true);
  const [delegationTxDeposit, setDelegationTxDeposit] = useState(0);
  const protocolParameters = useObservable(inMemoryWallet.protocolParameters$);
  const rewardAccounts = useObservable(inMemoryWallet.delegation.rewardAccounts$);
  const loading = isNil(protocolParameters) || isNil(rewardAccounts);

  const delegateFirstStakeCredential = useCallback(
    (txBuilder: TxBuilder) => {
      const pool = draftPortfolio[0]?.stakePool.id;
      return txBuilder.delegateFirstStakeCredential(pool || null);
    },
    [draftPortfolio]
  );

  const delegatePortfolio = useCallback(
    (txBuilder: TxBuilder) => {
      const pools = draftPortfolio.map((pool) => ({ id: pool.id, weight: pool.sliderIntegerPercentage }));
      return txBuilder.delegatePortfolio(pools.length > 0 ? { pools } : null);
    },
    [draftPortfolio]
  );

  const delegate = useCallback(
    (txBuilder: TxBuilder) => (isSharedWallet ? delegateFirstStakeCredential(txBuilder) : delegatePortfolio(txBuilder)),
    [isSharedWallet, delegateFirstStakeCredential, delegatePortfolio]
  );

  useEffect(() => {
    (async () => {
      if (loading) return;
      // TODO: move below logic to zustand store
      try {
        setIsBuildingTx(true);
        const txBuilder = inMemoryWallet.createTxBuilder();
        const tx = await delegate(txBuilder).build().inspect();
        const implicitCoin = Wallet.Cardano.util.computeImplicitCoin(protocolParameters, tx.body);
        const newDelegationTxDeposit = implicitCoin.deposit;
        const newDelegationTxReclaim = Wallet.util.calculateDepositReclaim(implicitCoin) || BigInt(0);
        setDelegationTxBuilder(txBuilder);
        setDelegationTxFee(tx.body.fee.toString());
        setStakingError();
        setDelegationTxDeposit(Number(newDelegationTxDeposit) - Number(newDelegationTxReclaim));
      } catch (error) {
        if (isDeRegistrationsWithRewardsLockedError(error)) {
          setStakingError({
            data: error.keysWithLockedRewards,
            type: StakingErrorType.REWARDS_LOCKED,
          });
        } else if (isInputSelectionError(error) && error.failure in ERROR_MESSAGES) {
          setStakingError({
            type: ERROR_MESSAGES[error.failure as keyof typeof ERROR_MESSAGES],
          });
        }
      } finally {
        setIsBuildingTx(false);
      }
    })();
  }, [
    draftPortfolio,
    inMemoryWallet,
    setDelegationTxBuilder,
    setDelegationTxFee,
    setIsBuildingTx,
    setStakingError,
    setDelegationTxDeposit,
    protocolParameters,
    loading,
    delegate,
  ]);

  const getErrorMessage = (error: StakingError): string | ReactElement => {
    if (error.type === StakingErrorType.UTXO_FULLY_DEPLETED) return t('drawer.confirmation.errors.utxoFullyDepleted');
    if (error.type === StakingErrorType.UTXO_BALANCE_INSUFFICIENT) {
      return t('drawer.confirmation.errors.utxoBalanceInsufficient');
    }
    return (
      <Trans
        i18nKey="drawer.confirmation.errors.rewardsLocked"
        t={t}
        components={{
          Link: <a onClick={() => openExternalLink(govToolUrl)} />,
          keys: <LockedStakeKeysList items={error.data} />,
        }}
      />
    );
  };

  const stakingCosigners = useMemo(
    (): CoSignersListItem[] =>
      coSigners?.map((signer) => ({
        ...signer,
        signed: false,
      })) || [],
    [coSigners]
  );

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
          <Banner customIcon={<ExclamationMarkIcon />} withIcon message={getErrorMessage(stakingError)} />
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

          {!stakingError && (
            <>
              <h1 className={styles.txSummaryTitle} data-testid="transaction-cost-title">
                {t(`drawer.confirmation.${isSharedWallet ? 'transactionDetails' : 'transactionCost'}.title`)}
              </h1>
              <div className={styles.txSummaryContainer} data-testid="summary-fee-container">
                {isSharedWallet && (
                  <RowContainer>
                    <TransactionSummary.Amount
                      amount={t('drawer.confirmation.validityPeriod.value', {
                        hours: SHARED_WALLET_TX_VALIDITY_INTERVAL,
                      })}
                      label={t('drawer.confirmation.validityPeriod.title')}
                      tooltip={t('drawer.confirmation.validityPeriod.tooltip')}
                      data-testid="validity-period"
                      className={styles.validityPeriod}
                    />
                  </RowContainer>
                )}

                {delegationTxDeposit > 0 && (
                  <RowContainer>
                    {renderLabel({
                      dataTestId: 'sp-confirmation-staking-deposit',
                      label: t('drawer.confirmation.stakingDeposit'),
                      tooltipContent: t('drawer.confirmation.chargedDepositAmountInfo'),
                    })}
                    <AmountInfo
                      {...{
                        amount: delegationTxDeposit.toString(),
                        cardanoCoin,
                        cardanoFiatPrice: priceResult?.cardano?.price || 0,
                        fiatCurrency,
                      }}
                    />
                  </RowContainer>
                )}

                <RowContainer>
                  {renderLabel({
                    dataTestId: 'sp-confirmation-staking-fee',
                    label: t('drawer.confirmation.transactionFee'),
                    tooltipContent: t('drawer.confirmation.theAmountYoullBeChargedToProcessYourTransaction'),
                  })}
                  <AmountInfo
                    {...{
                      amount: delegationTxFee,
                      cardanoCoin,
                      cardanoFiatPrice: priceResult?.cardano?.price || 0,
                      fiatCurrency,
                    }}
                  />
                </RowContainer>

                {delegationTxDeposit < 0 && <StakePoolDepositReclaimDetails {...{ delegationTxDeposit }} />}
              </div>
            </>
          )}

          {isSharedWallet && (
            <div>
              <SummaryExpander
                onClick={() => setIsCosignersOpen(!isCosignersOpen)}
                open={isCosignersOpen}
                title={t('sharedWallets.transaction.cosigners.title')}
              >
                <Box mb="$32">
                  <InfoBar signPolicy={signPolicy} />
                  {signPolicy.signers.length > 0 && (
                    <CosignersList
                      ownSharedKey={sharedWalletKey}
                      list={stakingCosigners}
                      title={t('sharedWallets.transaction.cosignerList.title.unsigned')}
                    />
                  )}
                </Box>
              </SummaryExpander>
            </div>
          )}
        </Skeleton>
      </div>
    </>
  );
};
