import React from 'react';
import styles from './Steps.module.scss';
import classnames from 'classnames';

export interface StepsProps {
  total: number;
  current: number;
}

export const Steps = ({ total, current }: StepsProps): React.ReactElement => (
  <div className={styles.steps}>
    {Array.from({ length: total }).map((_, index) => (
      <div key={index} className={styles.step}>
        {index === current && <p>Step {index + 1}</p>}
        <div className={index <= current ? classnames([styles.line, styles.lineActive]) : styles.line} />
      </div>
    ))}
  </div>
);
