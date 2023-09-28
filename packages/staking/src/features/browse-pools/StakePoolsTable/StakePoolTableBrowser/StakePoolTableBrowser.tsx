/* eslint-disable react/no-multi-comp */
import Icon from '@ant-design/icons';
import { Wallet } from '@lace/cardano';
import { List, ListProps, Tooltip } from 'antd';
import cn from 'classnames';
import isNumber from 'lodash/isNumber';
import React from 'react';
import { useTranslation } from 'react-i18next';
import InfiniteScroll from 'react-infinite-scroll-component';
import { useDelegationPortfolioStore } from '../../../store';
import { StakePoolItemBrowser, StakePoolItemBrowserProps } from '../StakePoolItemBrowser';
import Arrow from './arrow.svg';
import InfoIcon from './info-icon.component.svg';
import styles from './StakePoolTableBrowser.module.scss';

type TranslationsFor<T extends string> = Record<T, string>;
type SortKey = 'name' | 'apy' | 'saturation';
type SortDirection = 'asc' | 'desc';

export type StakePoolSortOptions = {
  field: Wallet.SortField;
  order: SortDirection;
};

export type StakePoolTableBrowserProps = {
  scrollableTargetId: string;
  className?: string;
  emptyText?: React.ReactNode | (() => React.ReactNode);
  items: StakePoolItemBrowserProps[];
  loadMoreData: () => void;
  total: number;
  emptyPlaceholder?: React.ReactNode | string;
  translations: TranslationsFor<'poolName' | 'apy' | 'saturation'>;
  setActiveSort: (props: StakePoolSortOptions) => void;
  activeSort: StakePoolSortOptions;
  showSkeleton?: boolean;
} & ListProps<StakePoolItemBrowserProps>;

interface TableHeaders {
  label: string;
  value: SortKey;
  tooltipText?: string;
}

const PoolSkeleton = () => (
  <div className={styles.skeleton} data-testid="stake-pool-skeleton">
    <div className={styles.skeletonAvatar} />
    <div className={styles.skeletonTitle} />
  </div>
);

export const StakePoolTableBrowser = ({
  scrollableTargetId,
  className,
  emptyText,
  total,
  loadMoreData,
  items,
  emptyPlaceholder = '',
  translations,
  activeSort,
  setActiveSort,
  showSkeleton,
  ...props
}: StakePoolTableBrowserProps): React.ReactElement => {
  const portfolioPools = useDelegationPortfolioStore((state) =>
    state.selectedPortfolio.map(({ id }) => ({
      // Had to cast it with fromKeyHash because search uses plain ID instead of hex.
      id: Wallet.Cardano.PoolId.fromKeyHash(id as unknown as Wallet.Crypto.Ed25519KeyHashHex),
    }))
  );
  const portfolioMutators = useDelegationPortfolioStore((store) => store.mutators);
  const { t } = useTranslation();
  const headers: TableHeaders[] = [
    { label: translations.poolName, value: 'name' },
    {
      label: translations.apy,
      tooltipText: t('browsePools.stakePoolTableBrowser.tableHeader.ros.tooltip'),
      value: 'apy',
    },
    {
      label: translations.saturation,
      tooltipText: t('browsePools.stakePoolTableBrowser.tableHeader.saturation.tooltip'),
      value: 'saturation',
    },
  ];

  const onSortChange = (field: SortKey) => {
    const order =
      field === activeSort?.field ? ((activeSort?.order === 'asc' ? 'desc' : 'asc') as SortDirection) : 'asc';
    setActiveSort({ field, order });
  };

  const selectedStakePools = items
    .filter((item) => portfolioPools.find((pool) => pool.id.toString() === item.id))
    .map((pool) => ({
      ...pool,
      onUnselect: () => portfolioMutators.executeCommand({ data: pool.hexId, type: 'UnselectPoolFromList' }),
    }));
  const availableStakePools = items.filter((item) => !selectedStakePools.some((pool) => pool.id === item.id));

  return (
    <div className={styles.stakepoolTable} data-testid="stake-pool-list-container">
      <div data-testid="stake-pool-list-header" className={styles.header}>
        {headers.map(({ label, value, tooltipText }) => (
          <div key={value} onClick={() => onSortChange(value)} data-testid={`stake-pool-list-header-${value}`}>
            <p>
              <span>{label}</span>
              {tooltipText && (
                <Tooltip placement="topLeft" title={tooltipText}>
                  <span className={styles.iconWrapper} data-testid={`browse-pools-${value}-column-info`}>
                    <InfoIcon className={styles.icon} />
                  </span>
                </Tooltip>
              )}
              <Icon
                component={Arrow}
                className={cn(
                  styles.triangle,
                  value === activeSort?.field && activeSort?.order === 'desc' ? styles.down : styles.up,
                  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                  { [styles.active!]: value === activeSort?.field }
                )}
                data-testid={`stake-pool-sort-order-${activeSort?.order}`}
              />
            </p>
          </div>
        ))}
      </div>
      {selectedStakePools?.length > 0 && (
        <>
          <div className={styles.selectedPools}>
            {selectedStakePools.map((pool) => (
              <StakePoolItemBrowser key={pool.id} {...pool} />
            ))}
          </div>
          <div className={styles.poolsSeparator} />
        </>
      )}
      <div data-testid="stake-pool-list-scroll-wrapper" className={styles.wrapper}>
        {isNumber(total) && !total && emptyPlaceholder}
        <InfiniteScroll
          dataLength={items?.length || 0}
          next={loadMoreData}
          hasMore={items?.length < (total || 0)}
          loader={<PoolSkeleton />}
          scrollableTarget={scrollableTargetId}
        >
          {showSkeleton || !isNumber(total) ? (
            <PoolSkeleton />
          ) : (
            <>
              <List
                className={className}
                data-testid="stake-pool-list"
                dataSource={availableStakePools}
                itemLayout="horizontal"
                locale={{ emptyText }}
                renderItem={(item: StakePoolItemBrowserProps) => (
                  <List.Item className={styles.listItemWrapper}>
                    <StakePoolItemBrowser {...item} />
                  </List.Item>
                )}
                {...props}
              />
            </>
          )}
        </InfiniteScroll>
      </div>
    </div>
  );
};
