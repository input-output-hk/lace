import { Tooltip as AntdTooltip } from 'antd';
import React from 'react';
import styles from './Stats.module.scss';

export const Tooltip = ({
  title,
  children,
  content,
}: {
  title?: string | number;
  children: string | React.ReactElement | React.ReactNode;
  content?: React.ReactNode;
}): React.ReactElement => {
  const body =
    content ||
    (title && (
      <>
        <div>{'USD Value'}</div>
        <div>{title}</div>
      </>
    ));

  if (!body) return <>{children}</>;

  return (
    <AntdTooltip placement="top" className={styles.tooltipWrapper} title={<div data-testid="tooltip">{body}</div>}>
      {children}
    </AntdTooltip>
  );
};
