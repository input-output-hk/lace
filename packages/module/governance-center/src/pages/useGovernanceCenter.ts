import {
  ADA_DECIMALS,
  DEFAULT_DECIMALS,
  getAdaTokenTickerByNetwork,
} from '@lace-contract/cardano-context';
import {
  getDelegationHealth,
  getDelegationStatus,
  toHttpImageUrl,
} from '@lace-contract/governance-center';
import { useTranslation } from '@lace-contract/i18n';
import { FeatureIds } from '@lace-contract/network';
import { NavigationControls, SheetRoutes } from '@lace-lib/navigation';
import { formatAmountToLocale } from '@lace-lib/util-render';
import debounce from 'lodash/debounce';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useDispatchLaceAction, useLaceSelector } from '../hooks';

import type { TFunction } from '@lace-contract/i18n';
import type { AnyAccount } from '@lace-contract/wallet-repo';
import type {
  GovernanceCardProps,
  GovernanceStatusCardProps,
} from '@lace-lib/ui-toolkit';

const BLOCKCHAIN_NAME = { blockchainName: 'Cardano' } as const;
const DEBOUNCE_DELAY_MS = 300;

const EMPTY_ACCOUNTS: AnyAccount[] = [];

const truncateDrepId = (drepId: string): string =>
  drepId.length > 14 ? `${drepId.slice(0, 8)}…${drepId.slice(-4)}` : drepId;

const buildDrepLabel = (
  drepId: string | undefined,
  resolvedName: string | undefined,
  t: TFunction,
): string | undefined => {
  switch (getDelegationStatus(drepId)) {
    case 'not-delegated':
      return undefined;
    case 'abstaining':
      return t('v2.governance.card.state.abstain');
    case 'no-confidence':
      return t('v2.governance.card.state.no-confidence');
    case 'delegated':
      // `drepId` is defined here (getDelegationStatus returns 'delegated'
      // only for a real, non-sentinel id).
      return resolvedName ?? truncateDrepId(drepId as string);
  }
};

export const useGovernanceCenter = () => {
  const { t } = useTranslation();

  const cardanoAccountsRaw = useLaceSelector(
    'wallets.selectActiveNetworkAccountsByBlockchainName',
    BLOCKCHAIN_NAME,
  );
  const cardanoAccounts = Array.isArray(cardanoAccountsRaw)
    ? cardanoAccountsRaw
    : EMPTY_ACCOUNTS;

  const rewardAccountDetailsMap = useLaceSelector(
    'cardanoContext.selectRewardAccountDetails',
  );
  const wallets = useLaceSelector('wallets.selectActiveNetworkWallets');
  const dReps = useLaceSelector('dRepsList.selectDReps');
  const dRepsFetchedAt = useLaceSelector('dRepsList.selectDRepsFetchedAt');
  const hasDRepsError = useLaceSelector('dRepsList.selectDRepsHasError');
  const networkType = useLaceSelector('network.selectNetworkType');
  const isBuyAvailable = useLaceSelector(
    'network.selectIsFeatureAvailable',
    FeatureIds.BUY_FLOW,
  );
  const fetchDReps = useDispatchLaceAction('dRepsList.fetchDRepsRequested');

  // Health checks need the full DRep list.
  useEffect(() => {
    fetchDReps();
  }, [fetchDReps]);

  const isListReady = dRepsFetchedAt !== null;

  // An exhausted fetch (ADR 15: no natural trigger) leaves `fetchedAt` null and
  // `error` true. Without a list, delegation health resolves to 'unknown' and
  // the cards fall back to the neutral 'delegated' state — so surface a banner
  // with a manual retry rather than letting a retired/expired DRep look healthy.
  const isDRepDataUnavailable = hasDRepsError && !isListReady;

  const retryFetchDReps = useCallback(() => {
    fetchDReps();
  }, [fetchDReps]);

  const adaTicker = useMemo(
    () => getAdaTokenTickerByNetwork(networkType),
    [networkType],
  );

  const walletNameById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const wallet of wallets) {
      map[wallet.walletId] = wallet.metadata.name;
    }
    return map;
  }, [wallets]);

  const delegatedCount = useMemo(
    () =>
      cardanoAccounts.filter(
        account =>
          rewardAccountDetailsMap[account.accountId]?.rewardAccountInfo
            .drepId !== undefined,
      ).length,
    [cardanoAccounts, rewardAccountDetailsMap],
  );

  const governanceStatusCard: GovernanceStatusCardProps = useMemo(
    () => ({
      delegatedCount,
      totalAccountsCount: cardanoAccounts.length,
    }),
    [delegatedCount, cardanoAccounts.length],
  );

  const navigateToBrowseDRep = useCallback((accountId: string) => {
    NavigationControls.navigate(SheetRoutes.BrowseDRep, { accountId });
  }, []);

  const navigateToBuy = useCallback((accountId: string) => {
    NavigationControls.navigate(SheetRoutes.Buy, { accountId });
  }, []);

  const governanceCards = useMemo<GovernanceCardProps[]>(
    () =>
      cardanoAccounts.map(account => {
        const rewardAccountInfo =
          rewardAccountDetailsMap[account.accountId]?.rewardAccountInfo;
        const drepId = rewardAccountInfo?.drepId;
        const delegatedSummary =
          drepId === undefined
            ? undefined
            : dReps.find(dRep => dRep.drepId === drepId);
        const resolvedName = delegatedSummary?.name;

        const health = getDelegationHealth({
          drepId,
          dReps,
          listReady: isListReady,
        });

        const hasFunds =
          rewardAccountInfo !== undefined &&
          rewardAccountInfo.controlledAmount.toString() !== '0';

        let state: GovernanceCardProps['state'];
        if (rewardAccountInfo === undefined) {
          state = 'loading';
        } else if (!hasFunds) {
          // No funds → nothing to delegate; mirror StakeCard's empty-account
          // CTA precedence (checked before delegation states).
          state = 'empty-account';
        } else if (health === 'not-delegated') {
          state = 'not-delegated';
        } else if (health === 'drep-problem') {
          state = 'drep-problem';
        } else {
          // 'delegated' and 'unknown' (list still loading — no false alarms).
          state = 'delegated';
        }

        const openBrowseDRep = () => {
          navigateToBrowseDRep(account.accountId);
        };

        return {
          avatarImage: { uri: '' },
          accountName: account.metadata.name,
          accountType:
            walletNameById[account.walletId] ??
            t('v2.portfolio.account.blockchainAccountType', {
              blockchain: account.blockchainName || 'Cardano',
            }),
          isShielded: false,
          blockchain: 'Cardano',
          state,
          votingPower: formatAmountToLocale(
            rewardAccountInfo?.controlledAmount.toString() ?? '0',
            ADA_DECIMALS,
            DEFAULT_DECIMALS,
          ),
          coin: adaTicker,
          drepLabel: buildDrepLabel(drepId, resolvedName, t),
          drepDisplayId:
            resolvedName !== undefined && drepId !== undefined
              ? truncateDrepId(drepId)
              : undefined,
          drepAvatarUri: toHttpImageUrl(delegatedSummary?.metadata?.imageUrl),
          drepVotingPower: delegatedSummary
            ? `₳ ${formatAmountToLocale(
                delegatedSummary.amount,
                ADA_DECIMALS,
                DEFAULT_DECIMALS,
              )}`
            : undefined,
          onDelegate: openBrowseDRep,
          onAddFunds: isBuyAvailable
            ? () => {
                navigateToBuy(account.accountId);
              }
            : undefined,
          onUpdateDelegation: openBrowseDRep,
          testID: `governance-card-${account.accountId}`,
        } satisfies GovernanceCardProps;
      }),
    [
      cardanoAccounts,
      rewardAccountDetailsMap,
      dReps,
      isListReady,
      walletNameById,
      adaTicker,
      navigateToBrowseDRep,
      navigateToBuy,
      isBuyAvailable,
      t,
    ],
  );

  const [searchValue, setSearchValue] = useState('');
  const [debouncedSearchValue, setDebouncedSearchValue] = useState('');
  const debouncedSetSearchValueRef = useRef(
    debounce((value: string) => {
      setDebouncedSearchValue(value);
    }, DEBOUNCE_DELAY_MS),
  );

  useEffect(() => {
    debouncedSetSearchValueRef.current(searchValue);
  }, [searchValue]);

  useEffect(() => {
    return () => {
      debouncedSetSearchValueRef.current.cancel();
    };
  }, []);

  const onSearchChange = useCallback((value: string) => {
    setSearchValue(value);
  }, []);

  const filteredGovernanceCards = useMemo(() => {
    const trimmed = debouncedSearchValue.trim();
    if (!trimmed) return governanceCards;
    const query = trimmed.toLowerCase();
    return governanceCards.filter(
      card =>
        card.accountName.toLowerCase().includes(query) ||
        card.accountType.toLowerCase().includes(query),
    );
  }, [governanceCards, debouncedSearchValue]);

  return {
    governanceStatusCard,
    governanceCards: filteredGovernanceCards,
    hasCardanoAccounts: cardanoAccounts.length > 0,
    searchValue,
    debouncedSearchValue,
    onSearchChange,
    isDRepDataUnavailable,
    retryFetchDReps,
  };
};
