import React from 'react';
import cn from 'classnames';
import styles from './TransactionDetailBrowser.module.scss';
import { useTranslate } from '@src/ui/hooks';
import { TransactionStatus } from '../Activity/AssetActivityItem';
import type { RewardsInfo } from './RewardsInfo';
import { Ellipsis } from '@lace/common';

export interface RewardDetailsProps {
  name: string;
  status?: TransactionStatus;
  includedDate?: string;
  includedTime?: string;
  amountTransformer: (amount: string) => string;
  coinSymbol: string;
  rewards?: RewardsInfo;
}

export const RewardDetails = ({
  name,
  status,
  includedDate = '-',
  includedTime = '-',
  amountTransformer,
  coinSymbol,
  rewards
}: RewardDetailsProps): React.ReactElement => {
  const { t } = useTranslate();
  const poolRewards = rewards?.rewards.filter((reward) => !!reward.pool);

  return (
    <div>
      <div className={styles.header}>{t('package.core.transactionDetailBrowser.header')}</div>
      <h1 className={styles.summary}>{t('package.core.transactionDetailBrowser.summary')}</h1>
      <div className={styles.block}>
        <div data-testid="tx-detail-bundle">
          <div className={styles.details}>
            <div className={styles.title}>{name}</div>
            <div data-testid="tx-sent-detail" className={styles.detail}>
              <div className={styles.amount}>
                <span
                  className={styles.ada}
                  data-testid="tx-sent-detail-ada"
                >{`${rewards.totalAmount} ${coinSymbol}`}</span>
                <span className={styles.fiat} data-testid="tx-sent-detail-fiat">{`${amountTransformer(
                  rewards.totalAmount
                )}`}</span>
              </div>
            </div>
          </div>
        </div>

        {poolRewards.length > 0 && (
          <div className={styles.stakingInfo}>
            <div className={cn(styles.title, styles.poolsTitle)}>
              {t('package.core.transactionDetailBrowser.pools')}
            </div>
            <div className={styles.poolsList}>
              {poolRewards?.map(({ pool, amount }) => (
                <div key={pool.id} className={styles.poolEntry}>
                  <div className={styles.poolHeading}>
                    {pool.name && (
                      <div data-testid="tx-pool-name" className={styles.detail}>
                        {pool.name}
                      </div>
                    )}
                    {pool.ticker && (
                      <div data-testid="tx-pool-ticker" className={cn(styles.detail, styles.lightLabel)}>
                        ({pool.ticker})
                      </div>
                    )}
                  </div>
                  {pool.id && (
                    <div data-testid="tx-pool-id" className={cn(styles.detail, styles.poolId, styles.lightLabel)}>
                      <Ellipsis text={pool.id} ellipsisInTheMiddle />
                    </div>
                  )}
                  <div className={styles.poolRewardAmount}>
                    <span data-testid="tx-pool-reward-ada" className={styles.ada}>
                      {amount} {coinSymbol}
                    </span>
                    <span data-testid="tx-pool-reward-fiat" className={styles.fiat}>
                      {amountTransformer(amount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className={styles.details}>
          <div className={styles.title}>{t('package.core.transactionDetailBrowser.status')}</div>
          {status && (
            <div data-testid="tx-status" className={styles.detail}>{`${status.charAt(0).toUpperCase()}${status.slice(
              1
            )}`}</div>
          )}
        </div>
        <div className={styles.details}>
          <div className={styles.title}>{t('package.core.transactionDetailBrowser.epoch')}</div>
          {<div data-testid="tx-rewards-epoch" className={styles.detail}>{`${rewards.spendableEpoch}`}</div>}
        </div>
        <div data-testid="tx-date" className={cn(styles.details, styles.timestampContainer)}>
          <div className={cn(styles.title, styles.timestamp)}>
            {t('package.core.transactionDetailBrowser.timestamp')}
          </div>
          <div data-testid="tx-timestamp" className={styles.detail}>
            <span>{includedDate}</span>
            <span>&nbsp;{includedTime}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
