import { Tooltip as AntdTooltip } from 'antd';
import React from 'react';
import styles from './Stats.module.scss';

export const Tooltip = ({
  title,
  children,
}: {
  title?: string | number;
  children: string | React.ReactElement | React.ReactNode;
}): React.ReactElement => {
  if (!title) return <>{children}</>;

  return (
    <AntdTooltip
      placement="top"
      className={styles.tooltipWrapper}
      title={
        <div data-testid="tooltip">
          <div>{'USD Value'}</div>
          <div>{title}</div>
        </div>
      }
    >
      {children}
    </AntdTooltip>
  );
};
