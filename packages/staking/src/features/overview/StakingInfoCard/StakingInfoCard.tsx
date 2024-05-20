import Icon from '@ant-design/icons';
import { Wallet } from '@lace/cardano';
import { getRandomIcon } from '@lace/common';
import { TranslationKey } from '@lace/translation';
import { Flex } from '@lace/ui';
import BigNumber from 'bignumber.js';
import cn from 'classnames';
import React, { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import MoonIcon from '../../../assets/icons/moon.component.svg';
import WarningIcon from '../../../assets/icons/warning.component.svg';
import { StakePoolInfo } from './StakePoolInfo';
import styles from './StakingInfoCard.module.scss';
import { Stats } from './Stats';
import { Tooltip } from './StatsTooltip';

const DEFAULT_DECIMALS = 2;

export const formatLocaleNumber = (value: string | number, decimalPlaces: number = DEFAULT_DECIMALS): string =>
  new BigNumber(value).toFormat(decimalPlaces, {
    decimalSeparator: '.',
    groupSeparator: ',',
    groupSize: 3,
  });

const formatNumericValue = (
  val: number | string,
  suffix: number | string,
  decimalPlaces: number = DEFAULT_DECIMALS
): React.ReactElement => (
  <>
    {val ? formatLocaleNumber(String(val), decimalPlaces) : '-'}
    {val !== undefined && <span className={styles.suffix}>{suffix}</span>}
  </>
);

export type PoolStatus = 'retired' | 'saturated' | 'retiring';

export type StakingInfoCardProps = {
  className?: string;
  totalStaked: string;
  fiat?: number;
  fee?: string | number;
  id: string;
  logo?: string;
  margin: string | number;
  name?: string;
  totalRewards: string;
  lastReward: string;
  ros?: string | number;
  ticker?: string;
  onStakePoolSelect: () => void;
  popupView?: boolean;
  cardanoCoinSymbol: string;
  markerColor?: string;
  status?: PoolStatus;
};

const iconsByPoolStatus: Record<PoolStatus, ReactNode> = {
  retired: <Icon style={{ color: '#FF8E3C', fontSize: '24px' }} component={MoonIcon} />,
  retiring: <Icon style={{ color: '#FDC300', fontSize: '24px' }} component={MoonIcon} />,
  saturated: <Icon style={{ color: '#FF5470', fontSize: '24px' }} component={WarningIcon} />,
};

const labelTranslationKeysByPoolStatus: Record<PoolStatus, TranslationKey> = {
  retired: 'overview.stakingInfoCard.poolRetired',
  retiring: 'overview.stakingInfoCard.poolRetiring',
  saturated: 'overview.stakingInfoCard.poolSaturated',
};

// eslint-disable-next-line complexity
export const StakingInfoCard = ({
  className,
  totalStaked,
  fiat,
  fee,
  id,
  logo,
  margin,
  name = '',
  totalRewards,
  lastReward,
  ros,
  ticker,
  onStakePoolSelect,
  popupView,
  cardanoCoinSymbol,
  markerColor,
  status,
}: StakingInfoCardProps): React.ReactElement => {
  const { t } = useTranslation();

  return (
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    <div className={cn(styles.panel, { className, [styles.popupView!]: popupView })}>
      <div className={styles.row}>
        <div className={styles.col}>
          {markerColor && <div className={styles.marker} style={{ background: markerColor }} />}
          <Flex justifyContent="space-between" alignItems="center" w="$fill">
            <StakePoolInfo
              logo={logo ?? getRandomIcon({ id: id.toString(), size: 30 })}
              name={name}
              ticker={ticker}
              id={id}
              onClick={onStakePoolSelect}
            />
            {status && (
              <Tooltip content={t(labelTranslationKeysByPoolStatus[status])}>{iconsByPoolStatus[status]}</Tooltip>
            )}
          </Flex>
        </div>
        <div className={cn(styles.col, styles.justifyContentSpaceAround)}>
          <Stats
            text={t('overview.stakingInfoCard.ros')}
            value={ros && formatNumericValue(ros, '%', 1)}
            popupView
            dataTestid="stats-ros"
          />
          <Stats
            text={t('overview.stakingInfoCard.fee')}
            value={fee && formatNumericValue(fee, cardanoCoinSymbol, 0)}
            popupView
            dataTestid="stats-fee"
          />
          <Stats
            text={t('overview.stakingInfoCard.margin')}
            value={formatNumericValue(margin, '%', 1)}
            popupView
            dataTestid="stats-margin"
          />
        </div>
      </div>
      <div className={styles.row}>
        <div className={styles.col}>
          {totalStaked && (
            <Stats
              text={t('overview.stakingInfoCard.totalStaked')}
              value={
                <Tooltip title={fiat && Wallet.util.convertAdaToFiat({ ada: totalStaked.toString(), fiat })}>
                  <span>{totalStaked}</span>
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
                <Tooltip title={fiat && Wallet.util.convertAdaToFiat({ ada: totalRewards.toString(), fiat })}>
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
              <Tooltip title={fiat && Wallet.util.convertAdaToFiat({ ada: lastReward.toString(), fiat })}>
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
