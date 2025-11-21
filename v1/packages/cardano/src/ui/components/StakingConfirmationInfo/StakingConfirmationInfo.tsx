import React from 'react';
import styles from './StakingConfirmationInfo.module.scss';
import { TranslationsFor } from '@wallet/util/types';

export interface StakingConfirmationInfoProps {
  poolId: string;
  transactionFee: string;
  deposit?: string;
  translations: TranslationsFor<'delegateTo' | 'poolId' | 'deposit' | 'transactionFee'>;
}

export const StakingConfirmationInfo = ({
  poolId,
  transactionFee,
  deposit,
  translations
}: StakingConfirmationInfoProps): React.ReactElement => (
  <div className={styles.stakinConfirmationContainer}>
    <div>
      <div className={styles.separator} />
      <p data-testid="staking-confirmation-title" className={styles.h3}>
        {translations.delegateTo}
      </p>

      <div data-testid="pool-id" className={styles.detailRow}>
        <label htmlFor="poolId">{translations.poolId}</label>
        <p id="poolId" className={styles.poolidText}>
          {poolId}
        </p>
      </div>
    </div>
    <div>
      <div className={styles.separator} />

      {deposit && (
        <div data-testid="deposit" className={styles.detailRow}>
          <label htmlFor="deposit">{translations.deposit}</label>
          <p className={styles.poolidText} id="deposit">
            {deposit}
          </p>
        </div>
      )}

      <div data-testid="tx-fee" className={styles.detailRow}>
        <label htmlFor="transactionFee">{translations.transactionFee}</label>
        <p className={styles.poolidText} id={transactionFee}>
          {transactionFee}
        </p>
      </div>
    </div>
  </div>
);
