/* eslint-disable complexity */
import { InputSelectionFailure } from '@cardano-sdk/input-selection';
import { TxBuilder } from '@cardano-sdk/tx-construction';
import { Box, SummaryExpander, TransactionSummary } from '@input-output-hk/lace-ui-toolkit';
import { Wallet } from '@lace/cardano';
import { Banner, useObservable } from '@lace/common';
import { CosignersList, InfoBar, RowContainer, renderLabel } from '@lace/core';
import { Skeleton } from 'antd';
import isNil from 'lodash/isNil';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useOutsideHandles } from '../../outside-handles-provider';
import { StakingError, useDelegationPortfolioStore, useStakingStore } from '../../store';
import { AmountInfo } from './AmountInfo';
import ExclamationMarkIcon from './exclamation-circle-small.svg';
import { StakePoolConfirmationBody } from './StakePoolConfirmationBody';
import styles from './StakePoolConfirmationContent.module.scss';
import { StakePoolDepositReclaimDetails } from './StakePoolDepositReclaimDetails';

const ERROR_MESSAGES: { [key: string]: StakingError } = {
  [InputSelectionFailure.UtxoFullyDepleted]: StakingError.UTXO_FULLY_DEPLETED,
  [InputSelectionFailure.UtxoBalanceInsufficient]: StakingError.UTXO_BALANCE_INSUFFICIENT,
};

export const stakingScriptKeyPath = {
  index: 0,
  role: Wallet.KeyManagement.KeyRole.Stake
};


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
    sharedKey,
    deriveSharedWalletExtendedPublicKeyHash,
  } = useOutsideHandles();
  const { draftPortfolio } = useDelegationPortfolioStore((store) => ({
    draftPortfolio: store.draftPortfolio || [],
  }));
  const [sharedKeyHash, setSharedKeyHash] = useState<Wallet.Crypto.Ed25519KeyHashHex | undefined>();

  useEffect(() => {
    (async () => {
      if (isSharedWallet && sharedKey) {
        setSharedKeyHash(await deriveSharedWalletExtendedPublicKeyHash(sharedKey, stakingScriptKeyPath));
      }
    })();
  }, [deriveSharedWalletExtendedPublicKeyHash, isSharedWallet, sharedKey])

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
    setDelegationTxBuilder,
    setDelegationTxFee,
    setIsBuildingTx,
    setStakingError,
    setDelegationTxDeposit,
    protocolParameters,
    loading,
    delegate,
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
          <h1 className={styles.txSummaryTitle} data-testid="transaction-cost-title">
            {t(`drawer.confirmation.${isSharedWallet ? 'transactionDetails' : 'transactionCost'}.title`)}
          </h1>
          <div className={styles.txSummaryContainer} data-testid="summary-fee-container">
            {isSharedWallet && (
              <RowContainer>
                <TransactionSummary.Amount
                  amount={t('drawer.confirmation.validityPeriod.value')}
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
          </div>

          {delegationTxDeposit < 0 && <StakePoolDepositReclaimDetails {...{ delegationTxDeposit }} />}

          {isSharedWallet && (
            <div>
              <SummaryExpander
                onClick={() => setIsCosignersOpen(!isCosignersOpen)}
                open={isCosignersOpen}
                title={t('sharedWallets.transaction.cosigners.title')}
              >
                <Box mb="$32">
                  <InfoBar signed={[]} signPolicy={signPolicy} />
                  {signPolicy.signers.length > 0 && (
                    <CosignersList
                      ownSharedKeyHash={sharedKeyHash}
                      list={signPolicy.signers}
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
