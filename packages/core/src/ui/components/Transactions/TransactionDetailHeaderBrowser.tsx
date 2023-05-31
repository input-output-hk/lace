import React from 'react';
import { ReactComponent as Info } from '../../assets/icons/info.component.svg';
import { Tooltip } from 'antd';
import styles from './TransactionDetailHeaderBrowser.module.scss';

export interface TransactionDetailHeaderBrowserProps {
  name: string;
  description: string;
  tooltipContent?: string;
}

export const TransactionDetailHeaderBrowser = ({
  name,
  description,
  tooltipContent
}: TransactionDetailHeaderBrowserProps): React.ReactElement => (
  <div data-testid="tx-description" className={styles.row}>
    <div className={styles.title}>
      <div className={styles.type}>{name}</div>
      {tooltipContent && (
        <Tooltip title={tooltipContent}>
          <Info className={styles.infoIcon} />
        </Tooltip>
      )}
    </div>

    <div className={styles.assets}>{description}</div>
  </div>
);
