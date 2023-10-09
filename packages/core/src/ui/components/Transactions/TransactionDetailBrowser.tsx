import React from 'react';
import styles from './TransactionDetailBrowser.module.scss';
import { TransactionDetailHeaderBrowser } from './TransactionDetailHeaderBrowser';
import { TransactionStatus } from '../Activity/AssetActivityItem';
import { RewardDetails, RewardDetailsProps } from './RewardDetails';
import { Transaction, TransactionProps } from './Transaction';
import { TransactionType } from './TransactionType';
import { useTranslate } from '@src/ui/hooks';

const getTypeLabel = (type: TransactionType, t: ReturnType<typeof useTranslate>['t']) => {
  if (type === 'rewards') return t('package.core.transactionDetailBrowser.rewards');
  if (type === 'delegation') return t('package.core.transactionDetailBrowser.delegation');
  if (type === 'delegationRegistration') return t('package.core.transactionDetailBrowser.registration');
  if (type === 'delegationDeregistration') return t('package.core.transactionDetailBrowser.deregistration');
  if (type === 'incoming') return t('package.core.transactionDetailBrowser.received');
  return t('package.core.transactionDetailBrowser.sent');
};

export type TransactionDetailBrowserProps = Omit<RewardDetailsProps, 'name'> &
  Omit<TransactionProps, 'name'> & {
    headerDescription?: string;
    type?: TransactionType;
    addressToNameMap: Map<string, string>;
    isPopupView?: boolean;
  };

export const TransactionDetailBrowser = ({
  status,
  headerDescription,
  includedDate,
  includedTime,
  amountTransformer,
  coinSymbol,
  type,
  isPopupView,
  rewards,
  ...props
}: TransactionDetailBrowserProps): React.ReactElement => {
  const { t } = useTranslate();

  const name =
    status === TransactionStatus.PENDING ? t('package.core.transactionDetailBrowser.sending') : getTypeLabel(type, t);
  const tooltipContent = type === 'rewards' ? t('package.core.transactionDetailBrowser.rewardsDescription') : undefined;

  const transactionProps: TransactionProps = {
    ...props,
    includedDate,
    includedTime,
    status,
    name,
    amountTransformer,
    coinSymbol,
    isPopupView
  };

  const rewardProps: RewardDetailsProps = {
    name,
    status,
    includedDate,
    includedTime,
    amountTransformer,
    coinSymbol,
    rewards
  };

  return (
    <div data-testid="transaction-detail" className={styles.content}>
      <TransactionDetailHeaderBrowser tooltipContent={tooltipContent} name={name} description={headerDescription} />
      {status === TransactionStatus.SPENDABLE ? (
        <RewardDetails {...rewardProps} />
      ) : (
        <Transaction {...transactionProps} />
      )}
    </div>
  );
};
