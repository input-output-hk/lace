import { useAnalytics } from '@lace-contract/analytics';
import {
  convertLovelacesToAda,
  getAdaTokenTickerByNetwork,
} from '@lace-contract/cardano-context';
import { useTranslation } from '@lace-contract/i18n';
import { NavigationControls } from '@lace-lib/navigation';
import { SheetRoutes } from '@lace-lib/navigation';
import { useTheme } from '@lace-lib/ui-toolkit';
import { getDefaultSortOrder, getOption, getOrder } from '@lace-lib/ui-toolkit';
import { compactNumberWithUnit, UnitThreshold } from '@lace-lib/util-render';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useLaceSelector, useSearchStakePools } from '../../hooks';
import { useNetworkInfo } from '../../hooks/useNetworkInfo';

import type { LaceBrowsePool } from '@lace-contract/cardano-stake-pools';
import type { AccountId } from '@lace-contract/wallet-repo';
import type { SheetScreenProps } from '@lace-lib/navigation';
import type {
  BrowsePoolProps,
  BrowsePoolSortOption,
  BrowsePoolSortOrder,
} from '@lace-lib/ui-toolkit';
import type { LayoutSize } from '@lace-lib/ui-toolkit';

const GRID_COLUMNS: Record<LayoutSize, number> = {
  compact: 2,
  medium: 3,
  large: 4,
};

type PoolComparator = (a: LaceBrowsePool, b: LaceBrowsePool) => number;

const createSorterByTicker = (isAsc: boolean): PoolComparator => {
  const placeholder = isAsc ? '\uFFFD' : '';
  return (a, b) => {
    const textA = (a.ticker ?? placeholder).toLowerCase();
    const textB = (b.ticker ?? placeholder).toLowerCase();
    return isAsc ? textA.localeCompare(textB) : textB.localeCompare(textA);
  };
};

type AllKeys = keyof LaceBrowsePool;
type NumericKeys = {
  [K in AllKeys]: LaceBrowsePool[K] extends number ? K : never;
}[AllKeys];
const createNumericSorter =
  (attribute: NumericKeys) =>
  (isAsc: boolean): PoolComparator => {
    return (a, b) => {
      const valueA = a[attribute];
      const valueB = b[attribute];
      return isAsc ? valueA - valueB : valueB - valueA;
    };
  };

/** Sorts on a figure the UI shape allows to be absent, sinking absences last. */
const optionalNumberSorter =
  (field: 'recommendation' | 'ros') =>
  (isAsc: boolean): PoolComparator =>
  (a, b) => {
    const left = a[field];
    const right = b[field];
    if (left === undefined || right === undefined) {
      return (left === undefined ? 1 : 0) - (right === undefined ? 1 : 0);
    }
    return isAsc ? left - right : right - left;
  };

const partialPoolSorterFactories = new Map<
  BrowsePoolSortOption,
  (isAsc: boolean) => PoolComparator
>([
  ['ticker', createSorterByTicker],
  // Undefined-safe (unlike createNumericSorter): both figures are optional on
  // the UI shape, and a pool without one must sink to the end IN EITHER ORDER.
  // For the recommendation an absent score means "the hard filters rejected
  // it", not "worst"; for the rate it means "not estimable yet". Ascending must
  // float neither to the top.
  ['ranking', optionalNumberSorter('recommendation')],
  ['ros', optionalNumberSorter('ros')],
  ['saturation', createNumericSorter('liveSaturation')],
  ['cost', createNumericSorter('cost')],
  ['margin', createNumericSorter('margin')],
  ['blocks', createNumericSorter('blocks')],
  ['pledge', createNumericSorter('declaredPledge')],
  ['liveStake', createNumericSorter('liveStake')],
]);

/**
 * Whether the user can tell what this pool IS from the list. A pool whose
 * metadata is absent — never published, or the fetch/parse failed, both of
 * which reach us as blank fields — renders as "??" with no name behind it.
 */
const isIdentifiable = (pool: LaceBrowsePool): boolean =>
  typeof pool.ticker === 'string' && pool.ticker.trim().length > 0;

/**
 * Unidentifiable pools sort last whatever the chosen order, ascending
 * included: a delegator cannot evaluate a pool they cannot name, so those
 * entries are the bottom of the list rather than a band that migrates to the
 * top when the direction flips. Within each group the chosen comparator
 * decides, so the order the user asked for still holds where it can be read.
 */
const identifiableFirst =
  (compare: PoolComparator): PoolComparator =>
  (a, b) => {
    const byIdentity = Number(isIdentifiable(b)) - Number(isIdentifiable(a));
    return byIdentity === 0 ? compare(a, b) : byIdentity;
  };

const getSorter = (field: BrowsePoolSortOption, order: BrowsePoolSortOrder) => {
  const isAsc = order === 'asc';
  const factory = partialPoolSorterFactories.get(field);

  if (!factory) throw new Error(`${String(field)}: Sort field not supported`);

  return identifiableFirst(factory(isAsc));
};

export const useBrowsePool = ({
  searchQuery,
  accountId,
  browsePoolSortOption,
  browsePoolSortOrder,
  ...poolSelection
}: SheetScreenProps<SheetRoutes.BrowsePool>['route']['params']): BrowsePoolProps & {
  /** The list is another flow's pick step, so the sheet titles it as a choice. */
  isSelecting: boolean;
} => {
  const { t } = useTranslation();
  const { layoutSize, theme } = useTheme();
  const [searchValue, setSearchValue] = useState(searchQuery || '');
  const networkType = useLaceSelector('network.selectNetworkType');

  const { pools, isLoading } = useSearchStakePools(searchValue);

  const accounts = useLaceSelector('cardanoContext.selectRewardAccountDetails');
  const poolId = accounts[accountId as AccountId]?.rewardAccountInfo.poolId;

  // Selection mode: another flow sent the user here to PICK, so this list is
  // that flow's own step. It says what picking does — including a vote
  // delegation riding the same transaction, disclosed BEFORE the choice —
  // because nothing else on screen explains why the user is looking at pools.
  //
  // The SENDING FLOW declares that, rather than this screen deriving it. The
  // picker knows nothing about who asked, and reading one consumer's target
  // here would bake its transaction semantics into a shared screen: a flow that
  // carries no vote certificate would promise a vote delegation that never
  // happens, and nothing at the type level would catch it.
  const { poolSelectionId, poolSelectionNotice } = poolSelection;
  const isSelecting = poolSelectionId !== undefined;
  const selectionNotice = useMemo(() => {
    if (!isSelecting) return undefined;
    return poolSelectionNotice === 'stake-and-vote'
      ? t('v2.pages.browse-pool.select-notice-with-vote')
      : t('v2.pages.browse-pool.select-notice');
  }, [isSelecting, poolSelectionNotice, t]);

  const { selectedOption, selectedOrder, sortedPools, isUserSorted } =
    useMemo(() => {
      const chosenOption = getOption(browsePoolSortOption);
      // Deliberate default, not provider order: with no sort chosen the list is
      // whatever order the upstream summaries happen to arrive in, which is no
      // basis for choosing where rewards go.
      //
      // The protocol's own ranking, NOT the current rate: ordering by what a
      // pool pays today flatters one that is small and lucky and says nothing
      // about what it pays once stake arrives (see rankPoolsByNonMyopicReward).
      // `chosenOption` stays undefined so the filter indicator only lights up
      // for a USER's choice.
      const selectedOption = chosenOption ?? 'ranking';
      const selectedOrder =
        getOrder(browsePoolSortOrder, selectedOption) ??
        getDefaultSortOrder(selectedOption);
      // Browsing hides the account's own pool — "stake here" is a no-op for
      // it. Selection mode must NOT: the pick may be spent on a DIFFERENT
      // account (the migration passes its picked destination while funds land
      // on a new one), so the passed account's pool is a legitimate — often
      // the intended — choice.
      const filtered =
        poolId && !isSelecting
          ? pools.filter(pool => pool.poolId !== poolId)
          : pools;
      const sorted = [...filtered].sort(
        getSorter(selectedOption, selectedOrder),
      );
      return {
        selectedOption,
        selectedOrder,
        sortedPools: sorted,
        // The indicator answers "does the list differ from the default?", so
        // an explicit re-pick of the default order must not light it — the
        // filter sheet round-trips the defaulted option as an explicit param,
        // and lighting on that read as an active filter that wasn't one.
        isUserSorted:
          chosenOption !== undefined &&
          (selectedOption !== 'ranking' ||
            selectedOrder !== getDefaultSortOrder('ranking')),
      };
    }, [browsePoolSortOption, browsePoolSortOrder, poolId, pools, isSelecting]);

  const numberOfColumns = useMemo(() => GRID_COLUMNS[layoutSize], [layoutSize]);
  const networkInfoValues = useNetworkInfo();

  const { trackEvent } = useAnalytics();
  const sortedPoolsRef = useRef(sortedPools);
  sortedPoolsRef.current = sortedPools;

  const hasTrackedSearchRef = useRef(false);
  useEffect(() => {
    if (!searchValue) {
      hasTrackedSearchRef.current = false;
      return;
    }
    if (hasTrackedSearchRef.current) return;
    const timer = setTimeout(() => {
      trackEvent('staking | pool | search | changed');
      hasTrackedSearchRef.current = true;
    }, 500);
    return () => {
      clearTimeout(timer);
    };
  }, [searchValue, trackEvent]);

  const handleFilterPress = useCallback(() => {
    NavigationControls.navigate(SheetRoutes.BrowsePoolFilterControls, {
      accountId,
      searchQuery: searchValue,
      browsePoolSortOption: selectedOption,
      browsePoolSortOrder: selectedOrder,
      // Dropped anywhere in the picker = selection mode silently lost.
      ...poolSelection,
    });
  }, [accountId, searchValue, selectedOption, selectedOrder, poolSelection]);

  const handlePoolPress = useCallback(
    (poolId: string) => {
      const pool = sortedPoolsRef.current?.find(p => p.poolId === poolId);
      trackEvent(
        'staking | pool | press',
        pool?.ticker ? { ticker: pool.ticker } : undefined,
      );
      NavigationControls.navigate(SheetRoutes.StakePoolDetails, {
        poolId,
        searchQuery: searchValue,
        accountId,
        browsePoolSortOption: selectedOption,
        browsePoolSortOrder: selectedOrder,
        ...poolSelection,
      });
    },
    [
      accountId,
      searchValue,
      selectedOption,
      selectedOrder,
      poolSelectionId,
      poolSelectionNotice,
      trackEvent,
    ],
  );

  const displayLovelaces = useMemo(() => {
    const adaTokenTicker = getAdaTokenTickerByNetwork(networkType);
    return (lovelaces: number) =>
      `${compactNumberWithUnit(
        convertLovelacesToAda(lovelaces),
        0,
        UnitThreshold.THOUSAND,
      )} ${adaTokenTicker}`;
  }, [networkType]);

  return {
    data: sortedPools,
    isSelecting,
    notice: selectionNotice,
    cardVariant: selectedOption,
    displayLovelaces,
    isLoading,
    numberOfColumns,
    searchPlaceholder: t('v2.pages.browse-pool.search-placeholder'),
    theme,
    networkInfoValues,
    searchValue,
    onSearchChange: setSearchValue,
    onFilterPress: handleFilterPress,
    onPoolPress: handlePoolPress,
    hasActiveFilters: isUserSorted,
  };
};
