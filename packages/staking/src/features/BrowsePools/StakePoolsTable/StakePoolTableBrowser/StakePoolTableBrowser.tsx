import { Wallet } from '@lace/cardano';
import { PostHogAction } from '@lace/common';
import { ListProps } from 'antd';
import React from 'react';
import { useOutsideHandles } from '../../../outside-handles-provider';
import { useDelegationPortfolioStore } from '../../../store';
import { Columns, StakePoolSortOptions, TranslationsFor } from '../types';
import { StakePoolTableBodyBrowser } from './StakePoolTableBodyBrowser';
import * as styles from './StakePoolTableBrowser.css';
import { StakePoolTableHeaderBrowser } from './StakePoolTableHeaderBrowser';
import { StakePoolTableItemBrowser } from './StakePoolTableItemBrowser';
import { StakePoolTableItemBrowserProps } from './types';

export type StakePoolTableBrowserProps = {
  scrollableTargetId: string;
  className?: string;
  emptyText?: React.ReactNode | (() => React.ReactNode);
  items: StakePoolTableItemBrowserProps[];
  loadMoreData: () => void;
  total: number;
  emptyPlaceholder?: React.ReactNode | string;
  translations: TranslationsFor<Columns>;
  setActiveSort: (props: StakePoolSortOptions) => void;
  activeSort: StakePoolSortOptions;
  showSkeleton?: boolean;
} & ListProps<StakePoolTableItemBrowserProps>;

export const StakePoolTableBrowser = ({
  scrollableTargetId,
  className,
  emptyText,
  total,
  loadMoreData,
  items,
  translations,
  activeSort,
  setActiveSort,
  showSkeleton,
  emptyPlaceholder,
  ...props
}: StakePoolTableBrowserProps): React.ReactElement => {
  const { analytics } = useOutsideHandles();

  const { portfolioMutators, portfolioPools } = useDelegationPortfolioStore((store) => ({
    portfolioMutators: store.mutators,
    portfolioPools: store.selectedPortfolio.map(({ id }) => ({
      // Had to cast it with fromKeyHash because search uses plain ID instead of hex.
      id: Wallet.Cardano.PoolId.fromKeyHash(id as unknown as Wallet.Crypto.Ed25519KeyHashHex),
    })),
  }));
  const selectedStakePools = items
    .filter((item) => portfolioPools.find((pool) => pool.id.toString() === item.id))
    .map((pool) => ({
      ...pool,
      onSelect: () => {
        portfolioMutators.executeCommand({ data: pool.hexId, type: 'UnselectPoolFromList' });
        analytics.sendEventToPostHog(PostHogAction.StakingBrowsePoolsUnselectClick);
      },
    }));
  const availableStakePools = items.filter((item) => !selectedStakePools.some((pool) => pool.id === item.id));

  return (
    <div className={styles.stakepoolTable} data-testid="stake-pool-list-container">
      <StakePoolTableHeaderBrowser {...{ activeSort, setActiveSort, translations }} />
      {selectedStakePools?.length > 0 && (
        <div className={styles.selectedPools}>
          {selectedStakePools.map((pool) => (
            <StakePoolTableItemBrowser key={pool.id} {...{ ...pool, selected: true }} />
          ))}
        </div>
      )}
      <StakePoolTableBodyBrowser
        {...{
          ItemRenderer: StakePoolTableItemBrowser,
          className,
          emptyPlaceholder:
            selectedStakePools.length > 0 && selectedStakePools.length === items.length ? '' : emptyPlaceholder,
          emptyText,
          items: availableStakePools,
          listProps: props,
          loadMoreData,
          scrollableTargetId,
          showSkeleton,
          total: total - selectedStakePools?.length,
        }}
      />
    </div>
  );
};
