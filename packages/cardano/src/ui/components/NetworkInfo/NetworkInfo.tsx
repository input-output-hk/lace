/* eslint-disable no-magic-numbers */
import React from 'react';
import { useCountdown } from '../../hooks/useCountdown';
import styles from './NetworkInfo.module.scss';
import { TranslationsFor } from '@wallet/util/types';

const formatNumericValue = (val: number | string, suffix: number | string): React.ReactElement => (
  <>
    {val || '-'} {val && <span className={styles.suffix}>{suffix}</span>}
  </>
);

export interface NetworkInfoProps {
  /**
   * Current epoch number
   */
  currentEpoch: string | number;
  /**
   * Total amount of stake pools
   */
  stakePoolsAmount: string | number;
  /**
   * Percentage of ADA staked over total ADA in the network
   */
  totalStakedPercentage: string | number;
  /**
   * Average rewards for the network in the current epoch
   */
  averageRewards?: string | number;
  /**
   * Average margin for all stake pools in the network
   */
  averageMargin?: string | number;
  /**
   * next epoch start date
   */
  nextEpochIn: string | number | Date;

  translations: TranslationsFor<
    'title' | 'currentEpoch' | 'epochEnd' | 'totalPools' | 'percentageStaked' | 'averageApy' | 'averageMargin'
  >;
}

export const NetworkInfo = ({
  currentEpoch,
  nextEpochIn,
  stakePoolsAmount,
  totalStakedPercentage,
  translations
}: NetworkInfoProps): React.ReactElement => {
  const { countdown: nextEpochInCountdown } = useCountdown(nextEpochIn);

  return (
    <div className={styles.card} data-testid="network-header-container">
      <div className={styles.title} data-testid="network-header-title">
        {translations.title}
      </div>
      <div className={styles.body}>
        <div className={styles.stats}>
          <div className={styles.label} data-testid="network-current-epoch-label">
            {translations.currentEpoch}
          </div>
          <div className={styles.value} data-testid="network-current-epoch-detail">
            {currentEpoch}
          </div>
        </div>
        <div className={styles.stats}>
          <div className={styles.label} data-testid="network-epoch-end-label">
            {translations.epochEnd}
          </div>
          <div className={styles.value} data-testid="network-epoch-end-detail">
            {nextEpochInCountdown}
          </div>
        </div>
        <div className={styles.stats}>
          <div className={styles.label} data-testid="network-total-pools-label">
            {translations.totalPools}
          </div>
          <div className={styles.value} data-testid="network-total-pools-detail">
            {stakePoolsAmount}
          </div>
        </div>
        <div className={styles.stats}>
          <div className={styles.label} data-testid="network-staked-label">
            {translations.percentageStaked}
          </div>
          <div className={styles.value} data-testid="network-staked-detail">
            {formatNumericValue(totalStakedPercentage, '%')}
          </div>
        </div>
        {/*
        TODO: uncomment when values are available. Remember that APY is deprecated. Please use ROS - https://input-output.atlassian.net/browse/LW-9975
        <div className={styles.stats}>
          <div className={styles.label} data-testid="network-avg-apy-label">
            {translations.averageApy}
          </div>
          <div className={styles.value} data-testid="network-avg-apy-detail">
            {formatNumericValue(averageRewards, '%')}
          </div>
        </div>
        <div className={styles.stats}>
          <div className={styles.label} data-testid="network-avg-margin-label">
            {translations.averageMargin}
          </div>
          <div className={styles.value} data-testid="network-avg-margin-detail">
            {formatNumericValue(averageMargin, '%')}
          </div>
        </div> */}
      </div>
    </div>
  );
};

export default NetworkInfo;
