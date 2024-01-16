/* eslint-disable quotes */
import React from 'react';
import styles from './DappTxHeader.module.scss';

export interface DappTxHeaderProps {
  title?: string;
  subtitle?: string;
}

export const DappTxHeader = (props: DappTxHeaderProps): React.ReactElement => (
  <div className={styles.header}>
    <div data-testid="dapp-transaction-title" className={styles.title}>
      ${'dapp header: '}${props?.title}${props?.subtitle}
      {props?.title ?? ''}
    </div>
    {props?.subtitle && (
      <div data-testid="dapp-transaction-type" className={styles.type}>
        {props.subtitle}
      </div>
    )}
  </div>
);
