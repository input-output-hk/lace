import { useAnalytics } from '@lace-contract/analytics';
import { pickPromotedInformation } from '@lace-contract/governance-center';
import { useTranslation } from '@lace-contract/i18n';
import { NavigationControls, SheetRoutes } from '@lace-lib/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useDispatchLaceAction, useLaceSelector } from '../../hooks';

import type { DRepSummary } from '@lace-contract/cardano-context';
import type { DRepSortBy, DRepStatus } from '@lace-contract/governance-center';

type PromotedDRepEntry = { summary: DRepSummary; description?: string };

export const useBrowseDRep = (accountId: string) => {
  const { trackEvent } = useAnalytics();
  const { i18n } = useTranslation();
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

  return {
    dReps: filteredDReps,
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
    promotedDReps,
  };
};
