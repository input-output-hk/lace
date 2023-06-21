import BigNumber from 'bignumber.js';
import cn from 'classnames';
import { JdenticonConfig, toSvg } from 'jdenticon';
import React from 'react';
import { useTranslation } from 'react-i18next';
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
  markerColor: string;
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
  markerColor,
}: StakingInfoCardProps): React.ReactElement => {
  const { t } = useTranslation();

  return (
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    <div className={cn(styles.panel, { className, [styles.popupView!]: popupView })}>
      <div className={styles.row}>
        <div className={styles.col}>
          <div className={styles.marker} style={{ background: markerColor }} />
          <div>
            <StakePoolInfo
              logo={logo ?? getRandomIcon({ id: id.toString(), size: 30 })}
              name={name}
              ticker={ticker}
              id={id}
              onClick={onStakePoolSelect}
            />
          </div>
        </div>
        <div className={cn(styles.col, styles.justifyContentSpaceAround)}>
          <Stats
            text={t('overview.stakingInfoCard.ros')}
            value={formatNumericValue(apy, '%')}
            popupView
            dataTestid="stats-apy"
          />
          <Stats
            text={t('overview.stakingInfoCard.fee')}
            value={formatNumericValue(fee, cardanoCoinSymbol)}
            popupView
            dataTestid="stats-fee"
          />
          <Stats
            text={t('overview.stakingInfoCard.margin')}
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
              text={t('overview.stakingInfoCard.totalStaked')}
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
              text={t('overview.stakingInfoCard.totalRewards')}
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
            text={t('overview.stakingInfoCard.lastReward')}
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
};
