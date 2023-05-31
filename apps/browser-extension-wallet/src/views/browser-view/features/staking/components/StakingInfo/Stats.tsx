import React from 'react';
import cn from 'classnames';
import styles from './Stats.module.scss';

export const Stats = ({
  text,
  value = '-',
  popupView,
  dataTestid
}: {
  text: string | React.ReactElement;
  value?: string | number | React.ReactElement;
  popupView?: boolean;
  dataTestid: string;
}): React.ReactElement => (
  <div data-testid={`${dataTestid}-container`} className={cn(styles.stat, { [styles.popupView]: popupView })}>
    <div data-testid="stats-title" className={styles.title}>
      {text}
    </div>
    <div data-testid="stats-value" className={styles.value}>
      {value}
    </div>
  </div>
);
