import React from 'react';
import styles from './ActivityDetailBrowser.module.scss';
import { ActivityDetailHeaderBrowser } from './ActivityDetailHeaderBrowser';
import { ActivityStatus } from '../Activity/AssetActivityItem';
import { RewardsDetails, RewardsDetailsProps } from './RewardsDetails';
import { TransactionDetails, TransactionDetailsProps } from './TransactionDetails';
import { ActivityType } from './ActivityType';
import { useTranslate } from '@src/ui/hooks';

const getTypeLabel = (type: ActivityType, t: ReturnType<typeof useTranslate>['t']) => {
  if (type === 'rewards') return t('package.core.transactionDetailBrowser.rewards');
  if (type === 'delegation') return t('package.core.transactionDetailBrowser.delegation');
  if (type === 'delegationRegistration') return t('package.core.transactionDetailBrowser.registration');
  if (type === 'delegationDeregistration') return t('package.core.transactionDetailBrowser.deregistration');
  if (type === 'incoming') return t('package.core.transactionDetailBrowser.received');
  return t('package.core.transactionDetailBrowser.sent');
};

export type ActivityDetailBrowserProps = Omit<RewardsDetailsProps, 'name'> &
  Omit<TransactionDetailsProps, 'name'> & {
    headerDescription?: string;
    type?: ActivityType;
    addressToNameMap: Map<string, string>;
    isPopupView?: boolean;
  };

export const ActivityDetailBrowser = ({
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
}: ActivityDetailBrowserProps): React.ReactElement => {
  const { t } = useTranslate();

  const name =
    status === ActivityStatus.PENDING ? t('package.core.transactionDetailBrowser.sending') : getTypeLabel(type, t);
  const tooltipContent = type === 'rewards' ? t('package.core.transactionDetailBrowser.rewardsDescription') : undefined;

  const transactionProps: TransactionDetailsProps = {
    ...props,
    includedDate,
    includedTime,
    status,
    name,
    amountTransformer,
    coinSymbol,
    isPopupView
  };

  const rewardsProps: RewardsDetailsProps = {
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
      <ActivityDetailHeaderBrowser tooltipContent={tooltipContent} name={name} description={headerDescription} />
      {status === ActivityStatus.SPENDABLE ? (
        <RewardsDetails {...rewardsProps} />
      ) : (
        <TransactionDetails {...transactionProps} />
      )}
    </div>
  );
};
