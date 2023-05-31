import React from 'react';
import { useTranslation } from 'react-i18next';
import { Tooltip as AntdTooltip } from 'antd';
import styles from './Stats.module.scss';

export const Tooltip = ({
  title,
  children
}: {
  title: string | number;
  children: string | React.ReactElement | React.ReactNode;
}): React.ReactElement => {
  const { t } = useTranslation();

  return (
    <AntdTooltip
      placement="top"
      className={styles.tooltipWrapper}
      title={
        <div data-testid="tooltip">
          <div>{t('browserView.staking.stakingInfo.tooltip.title')}</div>
          <div>{title}</div>
        </div>
      }
    >
      {children}
    </AntdTooltip>
  );
};
