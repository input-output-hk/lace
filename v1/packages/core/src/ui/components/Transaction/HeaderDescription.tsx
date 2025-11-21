import React from 'react';
import styles from '../ActivityDetail/TransactionDetails.module.scss';

export const HeaderDescription: React.FC = ({ children }) => (
  <div className={styles.header} data-testid="tx-header">
    {children}
  </div>
);
