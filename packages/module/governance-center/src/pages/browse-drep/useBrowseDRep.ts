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

// Voting-power credit stops growing past this share of the directory's total
// delegated power (1%), so size ranks the long tail but cannot buy the top of
// the list. Tunable; the reasoning lives in ADR 59.
const SHARE_CAP_DIVISOR = 100n;

// The browse card renders the name with a truncated-ID fallback; a row whose
// anchor did not resolve to a name gives a delegator nothing to evaluate.
const isIdentifiable = (dRep: DRepSummary): boolean =>
  Boolean(dRep.name?.trim());

// Completeness measured on substance, not schema width. Top tier = the
// profile the details view actually renders (CIP-119 objectives, motivations,
// qualifications) plus at least one reference — the only field pointing to a
// checkable identity outside the self-published metadata. Cosmetic or
// non-CIP-119 fields (image, bio, email) earn nothing, so a spec-faithful
// minimal profile is not penalised for a wide schema. Presence only — the
// ranking never judges what the fields say.
const profileTier = (dRep: DRepSummary): number => {
  const { metadata } = dRep;
  const narrativeFields = [
    metadata?.objectives,
    metadata?.motivations,
    metadata?.qualifications,
  ].filter(Boolean).length;
  if (narrativeFields === 3 && metadata?.references?.length) return 2;
  return narrativeFields > 0 ? 1 : 0;
};

// 32-bit FNV-1a: cheap, deterministic, well-dispersed for short strings.
const fnv1a = (value: string): number => {
  let hash = 0x81_1c_9d_c5;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01_00_01_93);
  }
  return hash >>> 0;
};

type LandingRank = {
  effectivePower: ReadonlyMap<string, bigint>;
  tier: ReadonlyMap<string, number>;
  rotation: ReadonlyMap<string, number>;
};

// Directory-wide rank inputs, computed over the WHOLE fetched list (before any
// filter/search): the share cap and the payment-address clusters are facts
// about the network, not about the rows currently in view. The rotation key is
// account-scoped: stable for one account, different across accounts, so no
// DRep owns a tie-band position across the user base.
const buildLandingRank = (
  dReps: DRepSummary[],
  accountId: string,
): LandingRank => {
  let total = 0n;
  const clusterSizes = new Map<string, number>();
  for (const dRep of dReps) {
    total += BigInt(dRep.amount);
    const paymentAddress = dRep.metadata?.paymentAddress;
    // Only active rows form clusters — a paymentAddress is self-published and
    // retired/lapsed rows keep theirs in the feed forever, so counting them
    // would let throwaway registrations pointed at a victim's address depress
    // its rank after their deposit is refunded (ADR 59).
    if (paymentAddress && dRep.isActive) {
      clusterSizes.set(
        paymentAddress,
        (clusterSizes.get(paymentAddress) ?? 0) + 1,
      );
    }
  }
  const cap = total / SHARE_CAP_DIVISOR;
  const effectivePower = new Map<string, bigint>();
  const tier = new Map<string, number>();
  const rotation = new Map<string, number>();
  for (const dRep of dReps) {
    const amount = BigInt(dRep.amount);
    const capped = amount < cap ? amount : cap;
    const paymentAddress = dRep.metadata?.paymentAddress;
    // DReps sharing a payment address are one operator wearing several ids:
    // the cluster shares one DRep's worth of power credit, which also blunts
    // dodging the share cap by splitting.
    const clusterSize =
      paymentAddress && dRep.isActive
        ? clusterSizes.get(paymentAddress) ?? 1
        : 1;
    effectivePower.set(dRep.drepId, capped / BigInt(clusterSize));
    tier.set(dRep.drepId, profileTier(dRep));
    rotation.set(dRep.drepId, fnv1a(`${accountId}:${dRep.drepId}`));
  }
  return { effectivePower, tier, rotation };
};

// The default landing order, applied until the user picks an explicit sort:
// active above retired/lapsed, identifiable above bare-ID rows, share-capped
// cluster-divided power, profile-completeness tier, then the per-account
// rotation key — so rows tied at the cap sit in an order that is stable for
// this account, unrelated to stake, and different in other wallets (the
// anti-feedback step: no DRep tops every Lace install). The credential hex is
// only the total-order fallback on a hash collision.
const byLandingRank =
  (rank: LandingRank) =>
  (a: DRepSummary, b: DRepSummary): number => {
    if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
    const isAIdentifiable = isIdentifiable(a);
    if (isAIdentifiable !== isIdentifiable(b)) return isAIdentifiable ? -1 : 1;
    const aPower = rank.effectivePower.get(a.drepId) ?? 0n;
    const bPower = rank.effectivePower.get(b.drepId) ?? 0n;
    if (aPower !== bPower) return bPower > aPower ? 1 : -1;
    const tierDifference =
      (rank.tier.get(b.drepId) ?? 0) - (rank.tier.get(a.drepId) ?? 0);
    if (tierDifference !== 0) return tierDifference;
    const rotationDifference =
      (rank.rotation.get(a.drepId) ?? 0) - (rank.rotation.get(b.drepId) ?? 0);
    if (rotationDifference !== 0) return rotationDifference;
    if (a.hex === b.hex) return 0;
    return a.hex < b.hex ? -1 : 1;
  };

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
  const activeBlocked = useLaceSelector('promotedDReps.selectActiveBlocked');

  const [searchValue, setSearchValue] = useState('');

  useEffect(() => {
    fetchDReps();
  }, [fetchDReps]);

  const landingRank = useMemo(
    () => buildLandingRank(dReps, accountId),
    [dReps, accountId],
  );

  const blockedIds = useMemo(() => new Set(activeBlocked), [activeBlocked]);

  const filteredDReps = useMemo(() => {
    let result = dReps;

    const query = searchValue.trim().toLowerCase();
    // The exact DRep id (either encoding) as a query is deliberate access, not
    // discovery: it is the one way a config-blocked DRep renders, and it works
    // for any DRep so a pasted legacy id resolves too.
    const isExactIdQuery = (dRep: DRepSummary) =>
      query === dRep.drepId.toLowerCase() ||
      query === dRep.cip105DrepId.toLowerCase();

    // Config-blocked DReps are hidden from the directory outright — every
    // order, filter, and partial search — so the browser cannot recommend or
    // surface them. Delegation to a pasted id is unaffected.
    result = result.filter(
      dRep => !blockedIds.has(dRep.drepId) || isExactIdQuery(dRep),
    );

    if (filterStatus !== 'all') {
      result = result.filter(dRep => {
        if (filterStatus === 'active') return dRep.isActive;
        if (filterStatus === 'retired') return dRep.retired;
        // 'inactive': expired but not retired.
        return dRep.expired && !dRep.retired;
      });
    }

    if (query.length > 0) {
      result = result.filter(
        dRep =>
          dRep.drepId.toLowerCase().includes(query) ||
          (dRep.name?.toLowerCase().includes(query) ?? false) ||
          isExactIdQuery(dRep),
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
    } else {
      result = [...result].sort(byLandingRank(landingRank));
    }

    return result;
  }, [dReps, filterStatus, filterSortBy, searchValue, landingRank, blockedIds]);

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

  const hasActiveFilters = filterStatus !== 'all' || filterSortBy !== null;

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
