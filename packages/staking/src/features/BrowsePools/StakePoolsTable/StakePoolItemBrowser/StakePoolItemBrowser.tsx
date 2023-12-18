/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Wallet } from '@lace/cardano';
import cn from 'classnames';
import React from 'react';
import { config } from '../utils';
import { MultiDelegationAction } from './MultiDelegationAction';
import * as styles from './StakePoolItemBrowser.css';

export type StakePoolItemBrowserProps = {
  id: string;
  hexId: Wallet.Cardano.PoolIdHex;
  name?: string;
  ticker?: string;
  apy?: string;
  saturation?: string;
  cost?: string;
  margin?: string;
  blocks?: string;
  pledge?: string;
  stakePool: Wallet.Cardano.StakePool;
  multiDelegationEnabled?: boolean;
  onClick?: () => void;
};

export const StakePoolItemBrowser = ({
  onClick,
  multiDelegationEnabled,
  hexId,
  stakePool,
  ...data
}: StakePoolItemBrowserProps): React.ReactElement => (
  <div
    data-testid="stake-pool-table-item"
    className={cn(styles.row, {
      [styles.withMultiDelegation!]: multiDelegationEnabled,
    })}
    onClick={() => onClick?.()}
  >
    {config.columns.map((cell, index) => (
      <div key={`${cell}-${index}`} className={styles.cell} data-testid={`stake-pool-list-${cell}`}>
        <span className={styles.cellInner}>{config.renderer[cell]?.({ value: data[cell] }) || data[cell] || '-'}</span>
      </div>
    ))}
    {multiDelegationEnabled && (
      <div className={styles.actions}>
        <MultiDelegationAction hexId={hexId} stakePool={stakePool} />
      </div>
    )}
  </div>
);
