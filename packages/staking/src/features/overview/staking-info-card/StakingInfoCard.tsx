import BigNumber from 'bignumber.js';
import cn from 'classnames';
import { JdenticonConfig, toSvg } from 'jdenticon';
import React from 'react';
import { StakePoolInfo } from './StakePoolInfo';
import styles from './StakingInfoCard.module.scss';
import { Stats } from './Stats';
import { Tooltip } from './StatsTooltip';

const DEFAULT_DECIMALS = 2;

export const formatLocaleNumber = (value: string, decimalPlaces: number = DEFAULT_DECIMALS): string =>
  new BigNumber(value).toFormat(decimalPlaces, {
    decimalSeparator: '.',
    groupSeparator: ',',
    groupSize: 3,
  });

export const getRandomIcon = (iconConfig: { id: string; size: number; jdenticonConfig?: JdenticonConfig }): string => {
  const icon = toSvg(iconConfig.id, iconConfig.size, iconConfig.jdenticonConfig);
  return `data:image/svg+xml;utf8,${encodeURIComponent(icon)}`;
};

const formatNumericValue = (val: number | string, suffix: number | string): React.ReactElement => (
  <>
    {val ? formatLocaleNumber(String(val)) : '-'}
    {val !== undefined && <span className={styles.suffix}>{suffix}</span>}
  </>
);

export type StakingInfoCardProps = {
  className?: string;
  coinBalance: string;
  coinBalanceFiat?: string;
  fee: string | number;
  id: string;
  logo?: string;
  margin: string | number;
  name?: string;
  totalRewards: string;
  totalRewardsFiat?: string;
  lastReward: string;
  lastRewardFiat?: string;
  apy: string | number;
  ticker?: string;
  onStakePoolSelect: () => void;
  popupView?: boolean;
  cardanoCoinSymbol: string;
};

export const StakingInfoCard = ({
  className,
  coinBalance,
  coinBalanceFiat,
  fee,
  id,
  logo,
  margin,
  name,
  totalRewards,
  totalRewardsFiat,
  lastReward,
  lastRewardFiat,
  apy,
  ticker,
  onStakePoolSelect,
  popupView,
  cardanoCoinSymbol,
}: StakingInfoCardProps): React.ReactElement => (
  <div className={cn(styles.panel, { className, [styles.popupView!]: popupView })}>
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
        <Stats text={'ROS'} value={formatNumericValue(apy, '%')} popupView dataTestid="stats-apy" />
        <Stats text={'Fee'} value={formatNumericValue(fee, cardanoCoinSymbol)} popupView dataTestid="stats-fee" />
        <Stats text={'Margin'} value={formatNumericValue(margin, '%')} popupView dataTestid="stats-margin" />
      </div>
    </div>
    <div className={styles.row}>
      <div className={styles.col}>
        {coinBalance && (
          <Stats
            text={'Total staked'}
            value={
              <Tooltip title={coinBalanceFiat && `$ ${coinBalanceFiat}`}>
                <span>{coinBalance}</span>
                <span className={styles.suffix}>{cardanoCoinSymbol}</span>
              </Tooltip>
            }
            dataTestid="stats-total-staked"
          />
        )}
      </div>
      {!popupView && (
        <div className={styles.col}>
          <Stats
            text={'Total rewards'}
            value={
              <Tooltip title={totalRewardsFiat && `$ ${totalRewardsFiat}`}>
                <span>{totalRewards}</span>
                <span className={styles.suffix}>{cardanoCoinSymbol}</span>
              </Tooltip>
            }
            dataTestid="stats-total-rewards"
          />
        </div>
      )}
      <div className={styles.col}>
        <Stats
          text={'Last reward'}
          value={
            <Tooltip title={lastRewardFiat && `$ ${lastRewardFiat}`}>
              <span>{lastReward}</span>
              <span className={styles.suffix}>{cardanoCoinSymbol}</span>
            </Tooltip>
          }
          dataTestid="stats-last-reward"
        />
      </div>
    </div>
  </div>
);
