/* eslint-disable no-magic-numbers */
import React from 'react';
import { InfoCircleOutlined } from '@ant-design/icons';
import { Tooltip } from 'antd';
import cn from 'classnames';
import styles from './TransactionFee.module.scss';
import { ReactComponent as Info } from '../../assets/icons/info-icon.component.svg';
import { useTranslate } from '@src/ui/hooks';

export interface TransactionFeeProps {
  fee: string;
  amountTransformer: (amount: string) => string;
  coinSymbol: string;
  title?: string;
  className?: string;
  displayTooltip?: boolean;
}
export const TransactionFee = ({
  fee,
  amountTransformer,
  coinSymbol,
  title,
  className,
  displayTooltip = true
}: TransactionFeeProps): React.ReactElement => {
  const { t } = useTranslate();

  return (
    <div className={cn(styles.details, className)}>
      <div className={styles.txFeeContainer}>
        <div className={styles.txfee} data-testid="tx-fee-title">
          {title ?? t('package.core.activityDetails.transactionFee')}
        </div>
        {displayTooltip && (
          <Tooltip title={t('package.core.activityDetails.transactionFeeInfo')}>
            {Info ? (
              <Info
                data-testid="tx-fee-tooltip-icon"
                style={{ fontSize: '18px', color: '#8f97a8', cursor: 'pointer' }}
              />
            ) : (
              <InfoCircleOutlined />
            )}
          </Tooltip>
        )}
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
