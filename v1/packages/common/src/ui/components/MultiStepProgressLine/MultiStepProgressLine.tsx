import React from 'react';
import styles from './MultiStepProgressLine.module.scss';
import classnames from 'classnames';

const MAX_PERCENTAGE = 100;

interface Step {
  progress: number;
  point?: number;
}

export interface MultiStepProgressLineProps {
  steps: Step[];
}

export const MultiStepProgressLine = ({ steps }: MultiStepProgressLineProps): React.ReactElement => (
  <div className={styles.multiStepProgressLine}>
    {steps.map(({ progress, point }, index) => (
      <div key={index} className={styles.lineWrapper}>
        <div key={index} className={styles.line}>
          <div style={{ width: `${progress * MAX_PERCENTAGE}%` }} className={styles.progress} />
          {point !== undefined && (
            <div
              style={{ left: `${point * MAX_PERCENTAGE}%` }}
              className={progress < point ? styles.point : classnames(styles.point, styles.activePoint)}
            />
          )}
        </div>
      </div>
    ))}
  </div>
);
