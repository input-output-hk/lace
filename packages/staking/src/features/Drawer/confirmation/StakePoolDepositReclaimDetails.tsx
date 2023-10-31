import { RowContainer, renderLabel } from '@lace/core';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useOutsideHandles } from '../../outside-handles-provider';
import { AmountInfo } from './AmountInfo';
import styles from './StakePoolDepositReclaimDetails.module.scss';

type StakePoolDepositReclaimDetailsProps = {
  delegationTxDeposit: number;
};

export const StakePoolDepositReclaimDetails = ({
  delegationTxDeposit,
}: StakePoolDepositReclaimDetailsProps): React.ReactElement => {
  const { t } = useTranslation();
  const {
    walletStoreWalletUICardanoCoin: cardanoCoin,
    delegationStoreDelegationTxFee: delegationTxFee = '0',
    fetchCoinPricePriceResult: priceResult,
    currencyStoreFiatCurrency: fiatCurrency,
  } = useOutsideHandles();
  const txDepositReclaim = Math.abs(delegationTxDeposit);
  const totalTxEffect = BigInt(txDepositReclaim) - BigInt(delegationTxFee);

  return (
    <>
      <h1 className={styles.txSummaryTitle} data-testid="transaction-return-title">
        {t('drawer.confirmation.transactionReturn.title')}
      </h1>
      <div className={styles.txSummaryContainer} data-testid="summary-tx-return-container">
        <RowContainer>
          {renderLabel({
            dataTestId: 'sp-confirmation-staking-reclaim-deposit',
            label: t('drawer.confirmation.stakingDeposit'),
            tooltipContent: t('drawer.confirmation.reclaimDepositAmountInfo'),
          })}
          <AmountInfo
            {...{
              amount: txDepositReclaim.toString(),
              cardanoCoin,
              cardanoFiatPrice: priceResult?.cardano?.price || 0,
              fiatCurrency,
            }}
          />
        </RowContainer>
      </div>
      <div className={styles.divider} />
      <div className={styles.totalCostContainer} data-testid="summary-total-cost-container">
        <RowContainer>
          <h2 className={styles.totalCostTitle} data-testid="transaction-total-title">
            {t('drawer.confirmation.transactionTotal.title')}
          </h2>
          <AmountInfo
            {...{
              amount: totalTxEffect.toString(),
              cardanoCoin,
              cardanoFiatPrice: priceResult?.cardano?.price || 0,
              fiatCurrency,
              sign: '+',
            }}
          />
        </RowContainer>
      </div>
    </>
  );
};
