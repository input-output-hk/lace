import React from 'react';
import cn from 'classnames';
import styles from './StakePoolMetricsBrowser.module.scss';
import { TranslationsFor } from '@wallet/util/types';

const formatNumericValue = (val: number | string, suffix: number | string): React.ReactElement => (
  <>
    {val ?? '-'} {val !== undefined && <span className={styles.suffix}>{suffix}</span>}
  </>
);

export interface StakePoolMetricsBrowserProps {
  apy: number | string;
  saturation: string | number;
  stake: { number: string; unit?: string };
  delegators: number | string;
  popupView?: boolean;
  translations: TranslationsFor<'activeStake' | 'saturation' | 'delegators' | 'apy'>;
}

export const StakePoolMetricsBrowser = ({
  apy,
  saturation,
  stake,
  delegators,
  popupView,
  translations
}: StakePoolMetricsBrowserProps): React.ReactElement => (
  <div className={cn(styles.stats, { [styles.popupView]: popupView })} data-testid="stake-pool-metrics-container">
    <div className={styles.statItem} data-testid="active-stake">
      <div className={styles.statHeader} data-testid="active-stake-title">
        {translations.activeStake}
      </div>
      <div className={styles.statBody} data-testid="active-stake-value">
        {formatNumericValue(stake.number, stake.unit)}
      </div>
    </div>
    <div className={styles.statItem} data-testid="saturation">
      <div className={styles.statHeader} data-testid="saturation-title">
        {translations.saturation}
      </div>
      <div className={styles.statBody} data-testid="saturation-value">
        {formatNumericValue(saturation, '%')}
      </div>
    </div>
    <div className={styles.statItem} data-testid="delegators">
      <div className={styles.statHeader} data-testid="delegators-title">
        {translations.delegators}
      </div>
      <div className={styles.statBody} data-testid="delegators-value">
        {delegators}
      </div>
    </div>
    <div className={styles.statItem} data-testid="apy">
      <div className={styles.statHeader} data-testid="apy-title">
        {translations.apy}
      </div>
      <div className={styles.statBody} data-testid="apy-value">
        {formatNumericValue(apy, '%')}
      </div>
    </div>
  </div>
);
