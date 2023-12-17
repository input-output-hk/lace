import { Wallet } from '@lace/cardano';
import { ListProps } from 'antd';

import React from 'react';
import { useOutsideHandles } from '../../../outside-handles-provider';
import { useDelegationPortfolioStore } from '../../../store';
import { analyticsActionsMap } from '../analytics';
import { StakePoolItemBrowser, StakePoolItemBrowserProps } from '../StakePoolItemBrowser';
import { Columns, SortDirection, SortField, StakePoolSortOptions, TranslationsFor } from '../types';
import { StakePoolTableBodyBrowser } from './StakePoolTableBodyBrowser';
import * as styles from './StakePoolTableBrowser.css';
import { StakePoolTableHeaderBrowser } from './StakePoolTableHeaderBrowser';

export const isSortingAvailable = (value: string) => Object.keys(SortField).includes(value);

export type StakePoolTableBrowserProps = {
  scrollableTargetId: string;
  className?: string;
  emptyText?: React.ReactNode | (() => React.ReactNode);
  items: StakePoolItemBrowserProps[];
  loadMoreData: () => void;
  total: number;
  emptyPlaceholder?: React.ReactNode | string;
  translations: TranslationsFor<Columns>;
  setActiveSort: (props: StakePoolSortOptions) => void;
  activeSort: StakePoolSortOptions;
  showSkeleton?: boolean;
} & ListProps<StakePoolItemBrowserProps>;

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
  const { analytics } = useOutsideHandles();
  const portfolioPools = useDelegationPortfolioStore((state) =>
    state.selectedPortfolio.map(({ id }) => ({
      // Had to cast it with fromKeyHash because search uses plain ID instead of hex.
      id: Wallet.Cardano.PoolId.fromKeyHash(id as unknown as Wallet.Crypto.Ed25519KeyHashHex),
    }))
  );
  const portfolioMutators = useDelegationPortfolioStore((store) => store.mutators);

  const onSortChange = (field: Columns) => {
    if (!Object.keys(SortField).includes(field)) return;
    const order =
      field === activeSort?.field && activeSort?.order === SortDirection.asc ? SortDirection.desc : SortDirection.asc;

    analytics.sendEventToPostHog(analyticsActionsMap[field]);
    setActiveSort({ field: field as unknown as SortField, order });
  };

  const selectedStakePools = items
    .filter((item) => portfolioPools.find((pool) => pool.id.toString() === item.id))
    .map((pool) => ({
      ...pool,
      onUnselect: () => portfolioMutators.executeCommand({ data: pool.hexId, type: 'UnselectPoolFromList' }),
    }));
  const availableStakePools = items.filter((item) => !selectedStakePools.some((pool) => pool.id === item.id));
  const isActiveSortItem = (value: string) => value === activeSort?.field;

  return (
    <div className={styles.stakepoolTable} data-testid="stake-pool-list-container">
      <StakePoolTableHeaderBrowser {...{ activeSort, isActiveSortItem, onSortChange, translations }} />
      {selectedStakePools?.length > 0 && (
        <div className={styles.selectedPools}>
          {selectedStakePools.map((pool) => (
            <StakePoolItemBrowser key={pool.id} {...pool} />
          ))}
        </div>
      )}
      <StakePoolTableBodyBrowser
        {...{
          ItemRenderer: StakePoolItemBrowser,
          className,
          emptyPlaceholder,
          emptyText,
          items: availableStakePools,
          listProps: props,
          loadMoreData,
          scrollableTargetId,
          showSkeleton,
          total,
        }}
      />
    </div>
  );
};
