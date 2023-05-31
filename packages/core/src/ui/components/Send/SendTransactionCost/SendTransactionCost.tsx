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
}

export const SendTransactionCost = ({
  label,
  adaAmount,
  fiatAmount,
  tooltipContent,
  onTooltipHover
}: SendTransactionCostProps): React.ReactElement => (
  <div className={styles.transactionCost}>
    <div className={styles.labelContainer}>
      <Text className={styles.label}>{label} </Text>
      <div>
        <Tooltip
          title={tooltipContent}
          onVisibleChange={(visible) => {
            if (visible && onTooltipHover) onTooltipHover();
          }}
        >
          <Info className={styles.infoIcon} />
        </Tooltip>
      </div>
    </div>

    <div className={styles.descriptionContainer}>
      <Text className={styles.ada}>{adaAmount}</Text>
      <Text className={styles.fiat}>{fiatAmount}</Text>
    </div>
  </div>
);
