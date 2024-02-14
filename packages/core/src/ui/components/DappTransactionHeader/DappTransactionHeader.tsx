import React from 'react';
import { Typography } from 'antd';

import styles from './DappTransactionHeader.module.scss';
import { useTranslate } from '@src/ui/hooks';

import { TransactionType, SummaryExpander, Card } from '@lace/ui';

const { Text } = Typography;

const TransactionTypes = {
  Withdrawal: 'withdrawal' as const,
  Receive: 'receive' as const,
  Sent: 'outgoing' as const,
  Send: 'send' as const,
  Sending: 'sending' as const,
  Mint: 'mint' as const,
  'Self Transaction': 'self' as const
};

type TransactionType = keyof typeof TransactionTypes;

export interface DappTransactionHeaderProps {
  name: string;
  transactionType?: TransactionType;
}

export const DappTransactionHeader = ({ transactionType, name }: DappTransactionHeaderProps): React.ReactElement => {
  const { t } = useTranslate();

  return (
    <div data-testid="transaction-type-container">
      <TransactionType
        label={t('package.core.dappTransaction.transaction')}
        transactionType={transactionType}
        data-testid="dapp-transaction-title"
      />
      <SummaryExpander title={t('package.core.dappTransaction.origin')}>
        <Card.Outlined className={styles.dappInfoContainer}>
          <Text className={styles.dappInfo} data-testid="dapp-transaction-type">
            {name}
          </Text>
        </Card.Outlined>
      </SummaryExpander>
    </div>
  );
};
