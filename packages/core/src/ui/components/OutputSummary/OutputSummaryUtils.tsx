import React from 'react';
import { Tooltip } from 'antd';
import { ReactComponent as Info } from '../../assets/icons/info-icon.component.svg';
import styles from './OutputSummary.module.scss';
import { SentAssetsList } from './OutputSummary';
import { Flex, Text } from '@input-output-hk/lace-ui-toolkit';

export const RowContainer = (props: { children: React.ReactNode; key?: string }): React.ReactElement => (
  <div key={props.key} className={styles.rowContent}>
    {props.children}
  </div>
);

export const renderAmountInfo = (amount: string, fiat: string, key?: string): JSX.Element => (
  <Flex
    key={key}
    className={styles.assetInfo}
    w="$fill"
    flexDirection="column"
    alignItems="flex-end"
    data-testid="asset-info"
  >
    <Text.Body.Normal weight="$medium" data-testid="asset-info-amount">
      {amount}
    </Text.Body.Normal>
    <Text.Body.Normal weight="$medium" color="secondary" data-testid="asset-info-amount-fiat">
      {fiat}
    </Text.Body.Normal>
  </Flex>
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
    <Text.Body.Normal weight="$semibold" data-testid={`${dataTestId}-label`}>
      {label}
    </Text.Body.Normal>

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
