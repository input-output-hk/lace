import { useAnalytics } from '@lace-contract/analytics';
import { pickPromotedInformation } from '@lace-contract/governance-center';
import { useTranslation } from '@lace-contract/i18n';
import { NavigationControls, SheetRoutes } from '@lace-lib/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useDispatchLaceAction, useLaceSelector } from '../../hooks';

import type { DRepSummary } from '@lace-contract/cardano-context';
import type { DRepSortBy, DRepStatus } from '@lace-contract/governance-center';

type PromotedDRepEntry = { summary: DRepSummary; description?: string };

export type DefaultDelegationOption = {
  type: 'alwaysAbstain' | 'alwaysNoConfidence';
  title: string;
  description: string;
};

export type BrowseDRepListItem =
  | { kind: 'drep'; summary: DRepSummary }
  | { kind: 'option'; option: DefaultDelegationOption };

export const useBrowseDRep = (accountId: string) => {
  const { trackEvent } = useAnalytics();
  const { t, i18n } = useTranslation();
  const fetchDReps = useDispatchLaceAction('dRepsList.fetchDRepsRequested');
  const dReps = useLaceSelector('dRepsList.selectDReps');
  const isLoading = useLaceSelector('dRepsList.selectDRepsIsInitiallyLoading');
  const hasError = useLaceSelector('dRepsList.selectDRepsHasError');
  const filterStatus = useLaceSelector('dRepsFilter.selectDRepStatus');
  const filterSortBy = useLaceSelector('dRepsFilter.selectDRepSortBy');
  const dispatchSetStatus = useDispatchLaceAction('dRepsFilter.setDRepStatus');
  const dispatchSetSortBy = useDispatchLaceAction('dRepsFilter.setDRepSortBy');
  const activePromoted = useLaceSelector('promotedDReps.selectActivePromoted');

  const [searchValue, setSearchValue] = useState('');

  useEffect(() => {
    fetchDReps();
  }, [fetchDReps]);

  const filteredDReps = useMemo(() => {
    let result = dReps;

    if (filterStatus !== 'all') {
      result = result.filter(dRep => {
        if (filterStatus === 'active') return dRep.isActive;
        if (filterStatus === 'retired') return dRep.retired;
        // 'inactive': expired but not retired.
        return dRep.expired && !dRep.retired;
      });
    }

    const query = searchValue.trim().toLowerCase();
    if (query.length > 0) {
      result = result.filter(
        dRep =>
          dRep.drepId.toLowerCase().includes(query) ||
          (dRep.name?.toLowerCase().includes(query) ?? false),
      );
    }

    if (filterSortBy === 'votingPower') {
      // Compare as bigint: Number() on the lovelace difference loses precision
      // past 2^53 and can misorder high-voting-power DReps.
      result = [...result].sort((a, b) => {
        const difference = BigInt(b.amount) - BigInt(a.amount);
        if (difference > 0n) return 1;
        if (difference < 0n) return -1;
        return 0;
      });
    } else if (filterSortBy === 'status') {
      result = [...result].sort((a, b) => {
        if (a.isActive === b.isActive) return 0;
        return a.isActive ? -1 : 1;
      });
    }

    return result;
  }, [dReps, filterStatus, filterSortBy, searchValue]);

  const promotedDReps = useMemo(
    () =>
      activePromoted
        .map((item): PromotedDRepEntry | undefined => {
          const summary = dReps.find(dRep => dRep.drepId === item.id);
          if (!summary) return undefined;
          return {
            summary,
            description: pickPromotedInformation(
              item.additional_information,
              i18n.language,
            ),
          };
        })
        .filter((entry): entry is PromotedDRepEntry => entry !== undefined),
    [activePromoted, dReps, i18n.language],
  );

  const hasActiveFilters =
    filterStatus !== 'all' || filterSortBy !== 'votingPower';

  const onSelectDRep = useCallback(
    (drepId: string) => {
      trackEvent('governance | drep | press');
      NavigationControls.navigate(SheetRoutes.DRepDetails, {
        accountId,
        drepId,
      });
    },
    [accountId, trackEvent],
  );

  // Abstain / no-confidence have no on-chain DRep to inspect, so they skip the
  // details sheet and go straight to the delegation confirmation.
  const onSelectDefaultOption = useCallback(
    (type: DefaultDelegationOption['type']) => {
      trackEvent('governance | drep | press');
      NavigationControls.navigate(SheetRoutes.NewDRepDelegation, {
        accountId,
        dRep: { type },
      });
    },
    [accountId, trackEvent],
  );

  const defaultDelegationOptions = useMemo<DefaultDelegationOption[]>(
    () => [
      {
        type: 'alwaysAbstain',
        title: t('v2.governance.browse-drep.option.abstain'),
        description: t('v2.governance.browse-drep.option.abstain-description'),
      },
      {
        type: 'alwaysNoConfidence',
        title: t('v2.governance.browse-drep.option.no-confidence'),
        description: t(
          'v2.governance.browse-drep.option.no-confidence-description',
        ),
      },
    ],
    [t],
  );

  const onSearchChange = useCallback((value: string) => {
    setSearchValue(value);
  }, []);

  // Manual retry (ADR 15): re-issues the original user-initiated fetch intent.
  const retry = useCallback(() => {
    fetchDReps();
  }, [fetchDReps]);

  const setStatus = useCallback(
    (status: DRepStatus) => {
      dispatchSetStatus({ status });
    },
    [dispatchSetStatus],
  );

  const setSortBy = useCallback(
    (sortBy: DRepSortBy) => {
      dispatchSetSortBy({ sortBy });
    },
    [dispatchSetSortBy],
  );

  // The options participate in search/filter like DReps do, so a no-match
  // search or a status filter they can't satisfy leaves the list empty and the
  // no-results message shows. They carry no registration status, so any status
  // filter other than 'all' excludes them; search matches their visible title.
  const filteredOptions = useMemo(() => {
    if (filterStatus !== 'all') return [];
    const query = searchValue.trim().toLowerCase();
    if (query.length === 0) return defaultDelegationOptions;
    return defaultDelegationOptions.filter(option =>
      option.title.toLowerCase().includes(query),
    );
  }, [filterStatus, searchValue, defaultDelegationOptions]);

  // The abstain / no-confidence options are ordinary rows at the bottom of the
  // list. They stay hidden while the initial-load skeleton or the error/retry
  // state owns the screen (both render via ListEmptyComponent, which only shows
  // for an empty list), then join the DReps once there is data to sit above.
  const listItems = useMemo<BrowseDRepListItem[]>(() => {
    if (filteredDReps.length === 0 && (isLoading || hasError)) return [];
    return [
      ...filteredDReps.map(
        (summary): BrowseDRepListItem => ({ kind: 'drep', summary }),
      ),
      ...filteredOptions.map(
        (option): BrowseDRepListItem => ({ kind: 'option', option }),
      ),
    ];
  }, [filteredDReps, isLoading, hasError, filteredOptions]);

  return {
    listItems,
    isLoading,
    hasError,
    retry,
    searchValue,
    onSearchChange,
    status: filterStatus,
    sortBy: filterSortBy,
    setStatus,
    setSortBy,
    hasActiveFilters,
    onSelectDRep,
    onSelectDefaultOption,
    promotedDReps,
  };
};
