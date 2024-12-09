import React from 'react';
import { ReactComponent as Info } from '../../assets/icons/info.component.svg';
import { Tooltip } from 'antd';
import styles from './ActivityDetailHeader.module.scss';

export interface ActivityDetailHeaderProps {
  name: string;
  description?: string;
  tooltipContent?: string;
}

export const ActivityDetailHeader = ({
  name,
  description,
  tooltipContent
}: ActivityDetailHeaderProps): React.ReactElement => (
  <div data-testid="tx-description" className={styles.row}>
    <div className={styles.title}>
      <div className={styles.type} data-testid="tx-description-type">
        {name}
      </div>
      {tooltipContent && (
        <Tooltip title={tooltipContent}>
          <Info className={styles.infoIcon} data-testid="tx-description-tooltip-icon" />
        </Tooltip>
      )}
    </div>

    {description && (
      <div className={styles.assets} data-testid="tx-description-details">
        {description}
      </div>
    )}
  </div>
);
