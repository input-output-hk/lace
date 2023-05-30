import React from 'react';
import { Typography, Tooltip } from 'antd';
import { ReactComponent as Info } from '../../assets/icons/info-icon.component.svg';
import styles from './OutputSummary.module.scss';
import { SentAssetsList } from './OutputSummary';

const { Text } = Typography;

export const RowContainer = (props: { children: React.ReactNode; key?: string }): React.ReactElement => (
  <div key={props.key} className={styles.rowContent}>
    {props.children}
  </div>
);

export const renderAmountInfo = (amount: string, fiat: string, key?: string): JSX.Element => (
  <div key={key} className={styles.assetInfo} data-testid="asset-info">
    <Text className={styles.asset} data-testid="asset-info-amount">
      {amount}
    </Text>
    <Text className={styles.fiat} data-testid="asset-info-amount-fiat">
      {fiat}
    </Text>
  </div>
);

export const renderSentAssets = (list: SentAssetsList): JSX.Element[] =>
  list.map(({ assetAmount, fiatAmount }, idx) => renderAmountInfo(assetAmount, fiatAmount, `${assetAmount}-${idx}`));

export const renderLabel = ({
  label,
  tooltipContent,
  dataTestId,
  onTooltipHover
}: {
  label: string;
  tooltipContent?: string;
  dataTestId?: string;
  onTooltipHover?: () => unknown;
}): JSX.Element => (
  <div className={styles.labelContainer}>
    <p className={styles.label} data-testid={`${dataTestId}-label`}>
      {label}
    </p>

    {tooltipContent && (
      <Tooltip
        title={tooltipContent}
        onVisibleChange={(visible) => {
          if (visible && onTooltipHover) onTooltipHover();
        }}
      >
        <Info className={styles.infoIcon} />{' '}
      </Tooltip>
    )}
  </div>
);
