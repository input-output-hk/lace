import { resolveEarnRewardsTarget } from '@lace-contract/earn-rewards';
import { useMemo } from 'react';

import { useLaceSelector } from '../hooks';

import type { EarnRewardsTarget } from '@lace-contract/earn-rewards';

/**
 * Resolves the earn-rewards target for the active Cardano network from the
 * feature-flag payloads. Thin hook over the shared UI-agnostic resolver so the
 * nudge, staking center, and governance center all resolve identically.
 *
 * Memoized on its flag + chainId inputs: the resolver returns a fresh object
 * each call, and consumers put `target` in effect deps (e.g. the one-shot
 * conversion event) — a stable identity keeps those from re-firing on unrelated
 * re-renders.
 */
export const useEarnRewardsTarget = (): EarnRewardsTarget | undefined => {
  const { featureFlags } = useLaceSelector('features.selectLoadedFeatures');
  const chainId = useLaceSelector('cardanoContext.selectChainId');
  return useMemo(
    () => resolveEarnRewardsTarget({ featureFlags, chainId }),
    [featureFlags, chainId],
  );
};
