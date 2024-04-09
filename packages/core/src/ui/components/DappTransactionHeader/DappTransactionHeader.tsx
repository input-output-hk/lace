import React from 'react';
import { Typography } from 'antd';

import styles from './DappTransactionHeader.module.scss';
import { useTranslate } from '@src/ui/hooks';

import { TransactionType, SummaryExpander, Card } from '@lace/ui';

const { Text } = Typography;

export enum TransactionTypes {
  Withdrawal = 'withdrawal',
  Receive = 'receive',
  Sent = 'sent',
  Send = 'send',
  Sending = 'sending',
  Mint = 'mint',
  'Self Transaction' = 'self'
}

type TransactionType = keyof typeof TransactionTypes;

export interface DappTransactionHeaderProps {
  name: string;
  transactionType?: TransactionType;
}

export const DappTransactionHeader = ({ transactionType, name }: DappTransactionHeaderProps): React.ReactElement => {
  const { t } = useTranslate();

  return (
    <div data-testid="transaction-type-container">
      <TransactionType label={t('core.dappTransaction.transaction')} transactionType={transactionType} />
      <SummaryExpander title={t('core.dappTransaction.origin')} testId="dapp-transaction-origin-expander">
        <Card.Outlined className={styles.dappInfoContainer}>
          <Text className={styles.dappInfo}>
            <span data-testid="dapp-transaction-origin">{name}</span>
          </Text>
        </Card.Outlined>
      </SummaryExpander>
    </div>
  );
};
