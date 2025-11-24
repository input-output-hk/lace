import React from 'react';
import { Typography, Tooltip } from 'antd';
import styles from './SendTransactionCost.module.scss';
import { ReactComponent as Info } from '../../../assets/icons/info.component.svg';

const { Text } = Typography;

export interface SendTransactionCostProps {
  label: string;
  adaAmount: string;
  fiatAmount: string;
  tooltipContent: React.ReactNode;
  onTooltipHover?: () => unknown;
  testId?: string;
}

export const SendTransactionCost = ({
  label,
  adaAmount,
  fiatAmount,
  tooltipContent,
  onTooltipHover,
  testId
}: SendTransactionCostProps): React.ReactElement => (
  <div className={styles.transactionCost}>
    <div className={styles.labelContainer}>
      <Text className={styles.label} data-testid={`${testId}-label`}>
        {label}{' '}
      </Text>
      <div>
        <Tooltip
          title={tooltipContent}
          onVisibleChange={(visible) => {
            if (visible && onTooltipHover) onTooltipHover();
          }}
        >
          <Info className={styles.infoIcon} data-testid={`${testId}-info-icon`} />
        </Tooltip>
      </div>
    </div>

    <div className={styles.descriptionContainer}>
      <Text data-testid={`${testId}-value-ada`} className={styles.ada}>
        {adaAmount}
      </Text>
      <Text data-testid={`${testId}-value-fiat`} className={styles.fiat}>
        {fiatAmount}
      </Text>
    </div>
  </div>
);
