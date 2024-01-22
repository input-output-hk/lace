/* eslint-disable no-magic-numbers */
import React from 'react';
import { InfoCircleOutlined } from '@ant-design/icons';
import { Tooltip } from 'antd';
import styles from './Amount.module.scss';
import { ReactComponent as Info } from '../../assets/icons/info-icon.component.svg';

export interface Props {
  amount: string;
  amountTransformer: (amount: string) => string;
  coinSymbol: string;
  label: string;
  tooltip: string;
}
export const Amount = ({ amount, amountTransformer, coinSymbol, label, tooltip }: Props): React.ReactElement => (
  <div className={styles.details}>
    <div className={styles.txAmountContainer}>
      <div className={styles.txAmount} data-testid="tx-fee-title">
        {label}
      </div>
      <Tooltip title={tooltip}>
        {Info ? (
          <Info data-testid="tx-fee-tooltip-icon" style={{ fontSize: '18px', color: '#8f97a8', cursor: 'pointer' }} />
        ) : (
          <InfoCircleOutlined />
        )}
      </Tooltip>
    </div>

    <div data-testid="tx-fee" className={styles.detail}>
      <div className={styles.amount}>
        <span data-testid="tx-fee-ada" className={styles.ada}>{`${amount} ${coinSymbol}`}</span>
        <span data-testid="tx-fee-fiat" className={styles.fiat}>
          {amountTransformer(amount)}
        </span>
      </div>
    </div>
  </div>
);
