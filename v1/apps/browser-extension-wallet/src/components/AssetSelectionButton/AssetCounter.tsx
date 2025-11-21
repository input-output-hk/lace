import React from 'react';
import styles from './AssetCounter.modules.scss';

interface AssetsCounterProps {
  count: number;
}

export const AssetsCounter = ({ count }: AssetsCounterProps): React.ReactElement => (
  <div className={styles.container} data-testid="assets-counter">
    <p>{count}</p>
  </div>
);
