import React from 'react';
import { ReactComponent as Info } from '../../assets/icons/info.component.svg';
import { Tooltip } from 'antd';
import styles from './ActivityDetailHeaderBrowser.module.scss';

export interface ActivityDetailHeaderBrowserProps {
  name: string;
  description: string;
  tooltipContent?: string;
}

export const ActivityDetailHeaderBrowser = ({
  name,
  description,
  tooltipContent
}: ActivityDetailHeaderBrowserProps): React.ReactElement => (
  <div data-testid="tx-description" className={styles.row}>
    <div className={styles.title}>
      <div className={styles.type}>{name}</div>
      {tooltipContent && (
        <Tooltip title={tooltipContent}>
          <Info className={styles.infoIcon} />
        </Tooltip>
      )}
    </div>

    <div className={styles.assets} data-testid="tx-description-details">
      {description}
    </div>
  </div>
);
