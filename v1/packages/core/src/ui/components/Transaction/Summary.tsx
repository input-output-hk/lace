import React from 'react';
import styles from '../ActivityDetail/TransactionDetails.module.scss';

export const Summary: React.FC = ({ children }) => (
  <h1 className={styles.summary} data-testid="summary-title">
    {children}
  </h1>
);
