import React from 'react';
import { InfoCircleOutlined } from '@ant-design/icons';
import { Tooltip } from 'antd';
import cn from 'classnames';
import styles from './TransactionFee.module.scss';
import { ReactComponent as Info } from '../../assets/icons/info-icon.component.svg';
import { useTranslate } from '@src/ui/hooks';

export interface TransactionFooterDetailsProps {
  fee: string;
  amountTransformer: (amount: string) => string;
  coinSymbol: string;
  title?: string;
  className?: string;
  displayTooltip?: boolean;
  displayFiat?: boolean;
  testId?: string;
}
export const TransactionFooterDetails = ({
  fee,
  amountTransformer,
  coinSymbol,
  title,
  className,
  displayTooltip = true,
  displayFiat = true,
  testId
}: TransactionFooterDetailsProps): React.ReactElement => {
  const { t } = useTranslate();

  return (
    <div className={cn(styles.details, className)}>
      <div className={styles.txFeeContainer}>
        <div className={styles.txfee} data-testid={testId ? `${testId}-title` : 'tx-fee-title'}>
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

      <div data-testid={testId ? `${testId}-fee` : 'tx-fee'} className={styles.detail}>
        <div className={styles.amount}>
          <span
            data-testid={testId ? `${testId}-ada` : 'tx-fee-ada'}
            className={styles.ada}
          >{`${fee} ${coinSymbol}`}</span>
          {displayFiat && (
            <span data-testid="tx-fee-fiat" className={styles.fiat}>
              {amountTransformer(fee)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
