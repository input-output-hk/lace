import { Wallet } from '@lace/cardano';
import { getRandomIcon } from '@lace/common';
import BigNumber from 'bignumber.js';
import cn from 'classnames';
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

const formatNumericValue = (val: number | string, suffix: number | string): React.ReactElement => (
  <>
    {val ? formatLocaleNumber(String(val)) : '-'}
    {val !== undefined && <span className={styles.suffix}>{suffix}</span>}
  </>
);

export type StakingInfoCardProps = {
  className?: string;
  coinBalance: number;
  fiat?: number;
  fee?: string | number;
  id: string;
  logo?: string;
  margin: string | number;
  name?: string;
  totalRewards: string;
  lastReward: string;
  apy?: string | number;
  ticker?: string;
  onStakePoolSelect: () => void;
  popupView?: boolean;
  cardanoCoinSymbol: string;
  markerColor?: string;
};

export const StakingInfoCard = ({
  className,
  coinBalance,
  fiat,
  fee,
  id,
  logo,
  margin,
  name,
  totalRewards,
  lastReward,
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
          {markerColor && <div className={styles.marker} style={{ background: markerColor }} />}
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
            value={apy && formatNumericValue(apy, '%')}
            popupView
            dataTestid="stats-apy"
          />
          <Stats
            text={t('overview.stakingInfoCard.fee')}
            value={fee && formatNumericValue(fee, cardanoCoinSymbol)}
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
                <Tooltip title={fiat && `$ ${Wallet.util.convertAdaToFiat({ ada: coinBalance.toString(), fiat })}`}>
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
                <Tooltip title={fiat && `$ ${Wallet.util.convertAdaToFiat({ ada: totalRewards.toString(), fiat })}`}>
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
              <Tooltip title={fiat && `$ ${Wallet.util.convertAdaToFiat({ ada: lastReward.toString(), fiat })}`}>
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
