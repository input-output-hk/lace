import React from 'react';
import isNil from 'lodash/isNil';
import styles from './PageTitle.module.scss';

export interface PageTitleProps {
  children: React.ReactNode;
  amount?: string | number;
  'data-testid'?: string;
}

export const PageTitle = ({ children, amount, ...rest }: PageTitleProps): React.ReactElement => (
  <h1 className={styles.pageTitle} data-testid={`${rest['data-testid'] || ''}`}>
    {children}
    {!isNil(amount) && (
      <span className={styles.amount} data-testid="counter">
        ({amount})
      </span>
    )}
  </h1>
);
