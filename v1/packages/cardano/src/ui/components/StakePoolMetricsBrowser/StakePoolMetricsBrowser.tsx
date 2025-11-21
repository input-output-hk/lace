import React from 'react';
import isNil from 'lodash/isNil';
import cn from 'classnames';
import styles from './StakePoolMetricsBrowser.module.scss';

const formatNumericValue = ({ value, unit }: { value?: number | string; unit: number | string }): React.ReactNode =>
  !isNil(value) ? (
    <>
      {value} <span className={styles.suffix}>{unit}</span>
    </>
  ) : (
    '-'
  );

export interface StakePoolMetricsBrowserProps {
  data: {
    value?: number | string;
    unit?: string;
    t: string;
    testId: string;
  }[];
  popupView?: boolean;
}

export const StakePoolMetricsBrowser = ({ data, popupView }: StakePoolMetricsBrowserProps): React.ReactElement => (
  <div className={cn(styles.stats, { [styles.popupView]: popupView })} data-testid="stake-pool-metrics-container">
    {data.map(({ value, unit, t, testId }) => (
      <div key={testId} className={styles.statItem} data-testid={testId}>
        <div className={styles.statHeader} data-testid={`${testId}-title`}>
          {t}
        </div>
        <div className={styles.statBody} data-testid={`${testId}-value`}>
          {unit ? formatNumericValue({ value, unit }) : value}
        </div>
      </div>
    ))}
  </div>
);
