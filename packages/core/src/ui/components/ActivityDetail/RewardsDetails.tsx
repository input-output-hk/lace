import React from 'react';
import cn from 'classnames';
import styles from './TransactionDetails.module.scss';
import { useTranslate } from '@src/ui/hooks';
import { ActivityStatus } from '../Activity/AssetActivityItem';
import { Ellipsis } from '@lace/common';
import { ActivityDetailHeader } from './ActivityDetailHeader';

type RewardItem = {
  pool?: { name: string; ticker: string; id: string };
  amount: string;
};

export type RewardsInfo = {
  totalAmount: string;
  spendableEpoch: number;
  rewards: RewardItem[];
};

export interface RewardsDetailsProps {
  name: string;
  headerDescription?: string;
  status: ActivityStatus.SPENDABLE;
  includedDate: string;
  includedTime: string;
  amountTransformer: (amount: string) => string;
  coinSymbol: string;
  rewards: RewardsInfo;
}

export const RewardsDetails = ({
  name,
  headerDescription,
  status,
  includedDate,
  includedTime,
  amountTransformer,
  coinSymbol,
  rewards
}: RewardsDetailsProps): React.ReactElement => {
  const { t } = useTranslate();
  const poolRewards = rewards.rewards.filter((reward) => !!reward.pool);
  const tooltipContent = t('core.activityDetails.rewardsDescription');

  return (
    <div data-testid="rewards-detail" className={styles.content}>
      <ActivityDetailHeader tooltipContent={tooltipContent} name={name} description={headerDescription} />
      <div>
        <div className={styles.header}>{t('core.activityDetails.header')}</div>
        <h1 className={styles.summary}>{t('core.activityDetails.summary')}</h1>
        <div className={styles.block}>
          <div data-testid="rewards-detail-bundle">
            <div className={styles.details}>
              <div className={styles.title}>{name}</div>
              <div data-testid="rewards-sent-detail" className={styles.detail}>
                <div className={styles.amount}>
                  <span
                    className={styles.ada}
                    data-testid="rewards-received-detail-ada"
                  >{`${rewards.totalAmount} ${coinSymbol}`}</span>
                  <span className={styles.fiat} data-testid="rewars-received-detail-fiat">{`${amountTransformer(
                    rewards.totalAmount
                  )}`}</span>
                </div>
              </div>
            </div>
          </div>

          {poolRewards.length > 0 && (
            <div className={styles.stakingInfo}>
              <div className={cn(styles.title, styles.poolsTitle)}>{t('core.activityDetails.pools')}</div>
              <div className={styles.poolsList}>
                {poolRewards.map(({ pool, amount }) => (
                  <div key={pool.id} className={styles.poolEntry}>
                    <div className={styles.poolHeading}>
                      {pool.name && (
                        <div data-testid="rewards-pool-name" className={styles.detail}>
                          {pool.name}
                        </div>
                      )}
                      {pool.ticker && (
                        <div data-testid="rewards-pool-ticker" className={cn(styles.detail, styles.lightLabel)}>
                          ({pool.ticker})
                        </div>
                      )}
                    </div>
                    {pool.id && (
                      <div
                        data-testid="rewards-pool-id"
                        className={cn(styles.detail, styles.poolId, styles.lightLabel)}
                      >
                        <Ellipsis text={pool.id} ellipsisInTheMiddle />
                      </div>
                    )}
                    <div className={styles.poolRewardAmount}>
                      <span data-testid="rewards-pool-reward-ada" className={styles.ada}>
                        {amount} {coinSymbol}
                      </span>
                      <span data-testid="rewards-pool-reward-fiat" className={styles.fiat}>
                        {amountTransformer(amount)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className={styles.details}>
            <div className={styles.title}>{t('core.activityDetails.status')}</div>
            <div data-testid="rewards-status" className={styles.detail}>{`${status
              .charAt(0)
              .toUpperCase()}${status.slice(1)}`}</div>
          </div>
          <div className={styles.details}>
            <div className={styles.title}>{t('core.activityDetails.epoch')}</div>
            <div data-testid="rewards-epoch" className={styles.detail}>{`${rewards.spendableEpoch}`}</div>
          </div>
          <div data-testid="rewards-date" className={cn(styles.details, styles.timestampContainer)}>
            <div className={cn(styles.title, styles.timestamp)}>{t('core.activityDetails.timestamp')}</div>
            <div data-testid="rewards-timestamp" className={styles.detail}>
              <span>{includedDate}</span>
              <span>&nbsp;{includedTime}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
