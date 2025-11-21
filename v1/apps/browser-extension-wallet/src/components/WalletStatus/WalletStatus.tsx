import React from 'react';
import classnames from 'classnames';
import styles from './WalletStatus.module.scss';

export enum Status {
  SYNCING = 'syncing',
  NOT_SYNCED = 'not synced',
  SYNCED = 'synced'
}

export interface WalletStatusProps {
  text: string;
  status?: Status;
}

export const WalletStatus = ({ status, text }: WalletStatusProps): React.ReactElement => (
  <div className={styles.status}>
    <div
      className={classnames([
        styles.statusCircle,
        {
          [styles.notSynced]: status === Status.NOT_SYNCED,
          [styles.synced]: status === Status.SYNCED,
          [styles.syncing]: status === Status.SYNCING
        }
      ])}
    />
    <p className={styles.statusDescription} data-testid="header-wallet-status">
      {text}
    </p>
  </div>
);
