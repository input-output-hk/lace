/* eslint-disable react/no-multi-comp */
/* eslint-disable no-magic-numbers */
import React, { useRef } from 'react';
import cn from 'classnames';
import { useTranslation } from 'react-i18next';
import { Wallet } from '@lace/cardano';
import styles from './StakingInfo.module.scss';
import { StakePoolInfo } from './StakePoolInfo';
import { Stats } from './Stats';
import { Tooltip } from './StatsTooltip';
import { addEllipsis, getRandomIcon, logger } from '@lace/common';
import { formatLocaleNumber } from '@utils/format-number';

const formatNumericValue = (val: number | string, suffix: number | string): React.ReactElement => (
  <>
    {val ? formatLocaleNumber(String(val)) : '-'}
    {val !== undefined && <span className={styles.suffix}>{suffix}</span>}
  </>
);

type stakingInfoPanelProps = {
  className?: string;
  coinBalance: number;
  fee: string;
  fiat: number;
  id: string;
  logo?: string;
  margin: string;
  name?: string;
  totalRewards: string;
  lastReward: string;
  ros?: string;
  ticker?: string;
  rewardAccount?: Wallet.Cardano.RewardAccountInfo;
  onStakePoolSelect: () => void;
  popupView?: boolean;
  cardanoCoin: Wallet.CoinId;
};

export const StakingInfo = ({
  className,
  coinBalance,
  fee,
  fiat,
  id,
  logo,
  margin,
  name,
  totalRewards,
  lastReward,
  ros,
  ticker,
  rewardAccount,
  onStakePoolSelect,
  popupView,
  cardanoCoin
}: stakingInfoPanelProps): React.ReactElement => {
  const { t } = useTranslation();
  const ref = useRef();

  // Debug logging for rewards display
  logger.info('🔍 [STAKING_INFO_DEBUG] === STAKING INFO COMPONENT DEBUG ===');
  logger.info('🔍 [STAKING_INFO_DEBUG] Component props:', {
    totalRewards,
    lastReward,
    totalRewardsType: typeof totalRewards,
    lastRewardType: typeof lastReward,
    coinBalance,
    id: id?.toString()
  });

  // Log the rewards values being displayed
  if (totalRewards) {
    logger.info('🔍 [STAKING_INFO_DEBUG] totalRewards details:', {
      value: totalRewards,
      type: typeof totalRewards,
      stringValue: totalRewards.toString(),
      isBigInt: typeof totalRewards === 'bigint',
      isNumber: typeof totalRewards === 'number'
    });
  }

  if (lastReward) {
    logger.info('🔍 [STAKING_INFO_DEBUG] lastReward details:', {
      value: lastReward,
      type: typeof lastReward,
      stringValue: lastReward.toString(),
      isBigInt: typeof lastReward === 'bigint',
      isNumber: typeof lastReward === 'number'
    });
  }

  logger.info('🔍 [STAKING_INFO_DEBUG] === END STAKING INFO DEBUG ===');

  return (
    <div
      ref={ref}
      data-testid="staking-info-container"
      className={cn(styles.stakingInfo, { [styles.popupView]: popupView })}
    >
      <div className={styles.header} data-testid="staking-info-title">
        {t('browserView.staking.stakingInfo.title')}
      </div>
      <div className={cn(styles.panel, { className })}>
        <div className={styles.row}>
          <div className={styles.col}>
            <StakePoolInfo
              logo={logo ?? getRandomIcon({ id: id.toString(), size: 30 })}
              name={name}
              ticker={ticker}
              id={id}
              onClick={onStakePoolSelect}
              popupView
            />
          </div>
          <div className={cn(styles.col, styles.justifyContentSpaceAround)}>
            <Stats
              text={t('browserView.staking.stakingInfo.stats.ros')}
              value={formatNumericValue(ros, '%')}
              popupView
              dataTestid="stats-ros"
            />
            <Stats
              text={t('browserView.staking.stakingInfo.stats.Fee')}
              value={formatNumericValue(fee, cardanoCoin.symbol)}
              popupView
              dataTestid="stats-fee"
            />
            <Stats
              text={t('browserView.staking.stakingInfo.stats.Margin')}
              value={formatNumericValue(margin, '%')}
              popupView
              dataTestid="stats-margin"
            />
          </div>
        </div>
        <div className={styles.row}>
          <div className={styles.col}>
            {coinBalance && (
              <Stats
                text={t('browserView.staking.stakingInfo.totalStaked.title')}
                value={
                  <Tooltip title={Wallet.util.convertAdaToFiat({ ada: coinBalance.toString(), fiat })}>
                    <span>{coinBalance}</span>
                    <span className={styles.suffix}>{cardanoCoin.symbol}</span>
                  </Tooltip>
                }
                dataTestid="stats-total-staked"
              />
            )}
          </div>
          {!popupView && (
            <div className={styles.col}>
              <Stats
                text={t('browserView.staking.stakingInfo.totalRewards.title')}
                value={
                  <Tooltip title={`Debug: Type=${typeof totalRewards}, Value=${totalRewards}`}>
                    <span>{totalRewards}</span>
                    <span className={styles.suffix}>{cardanoCoin.symbol}</span>
                  </Tooltip>
                }
                dataTestid="stats-total-rewards"
              />
            </div>
          )}
          <div className={styles.col}>
            <Stats
              text={t('browserView.staking.stakingInfo.lastReward.title')}
              value={
                <Tooltip title={`Debug: Type=${typeof lastReward}, Value=${lastReward}`}>
                  <span>{lastReward}</span>
                  <span className={styles.suffix}>{cardanoCoin.symbol}</span>
                </Tooltip>
              }
              dataTestid="stats-last-reward"
            />
          </div>
        </div>
        {rewardAccount && (
          <div className={styles.row}>
            <div className={styles.col}>
              <Stats
                text={t('browserView.staking.stakingInfo.stats.stakeKey')}
                value={
                  <Tooltip content={rewardAccount.address}>
                    <div className={styles.colContent}>
                      {popupView ? addEllipsis(rewardAccount.address, 14, 9) : rewardAccount.address}
                    </div>
                  </Tooltip>
                }
                dataTestid="stats-stake-key"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
