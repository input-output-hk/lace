import { Tooltip as AntdTooltip } from 'antd';
import { useOutsideHandles } from 'features/outside-handles-provider';
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
  const { currencyStoreFiatCurrency } = useOutsideHandles();
  const body =
    content ||
    (title && (
      <>
        <div data-testid="tooltip-label">
          {t('overview.stakingInfoCard.tooltipFiatLabel', { currencyCode: currencyStoreFiatCurrency.code })}
        </div>
        <div data-testid="tooltip-value">
          {currencyStoreFiatCurrency.symbol} {title}
        </div>
      </>
    ));

  if (!body) return <>{children}</>;

  return (
    <AntdTooltip placement="top" className={styles.tooltipWrapper} title={<div data-testid="tooltip">{body}</div>}>
      {children}
    </AntdTooltip>
  );
};
