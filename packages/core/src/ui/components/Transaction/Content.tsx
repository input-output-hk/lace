import React from 'react';
import styles from '../ActivityDetail/TransactionDetails.module.scss';

export const Content: React.FC = ({ children }) => (
  <div data-testid="transaction-detail" className={styles.content}>
    {children}
  </div>
);
