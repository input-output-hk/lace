/* eslint-disable no-magic-numbers */
import React from 'react';
import { InfoCircleOutlined } from '@ant-design/icons';
import { Tooltip } from 'antd';
import styles from './TransactionFee.module.scss';
import { ReactComponent as Info } from '../../assets/icons/info-icon.component.svg';
import { useTranslate } from '@src/ui/hooks';

export interface TransactionFeeProps {
  fee: string;
  amountTransformer: (amount: string) => string;
  coinSymbol: string;
}
export const TransactionFee = ({ fee, amountTransformer, coinSymbol }: TransactionFeeProps): React.ReactElement => {
  const { t } = useTranslate();

  return (
    <div className={styles.details}>
      <div className={styles.txFeeContainer}>
        <div className={styles.txfee}>{t('package.core.activityDetails.transactionFee')}</div>
        <Tooltip title={t('package.core.activityDetails.transactionFeeInfo')}>
          {Info ? <Info style={{ fontSize: '18px', color: '#8f97a8', cursor: 'pointer' }} /> : <InfoCircleOutlined />}
        </Tooltip>
      </div>

      <div data-testid="tx-fee" className={styles.detail}>
        <div className={styles.amount}>
          <span data-testid="tx-fee-ada" className={styles.ada}>{`${fee} ${coinSymbol}`}</span>
          <span data-testid="tx-fee-fiat" className={styles.fiat}>
            {amountTransformer(fee)}
          </span>
        </div>
      </div>
    </div>
  );
};
