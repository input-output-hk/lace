import { Tooltip as AntdTooltip } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const body =
    content ||
    (title && (
      <>
        <div data-testid="tooltip-label">{t('overview.stakingInfoCard.tooltipFiatLabel')}</div>
        <div data-testid="tooltip-value">{title}</div>
      </>
    ));

  if (!body) return <>{children}</>;

  return (
    <AntdTooltip placement="top" className={styles.tooltipWrapper} title={<div data-testid="tooltip">{body}</div>}>
      {children}
    </AntdTooltip>
  );
};
