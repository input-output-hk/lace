import { getRealFiConfigFromFlags } from '@lace-contract/realfi-staking';
import { useMemo } from 'react';

import { useLaceSelector } from './hooks';

import type { RealFiNetworkConfig } from '@lace-contract/realfi-staking';

const CARDANO = 'Cardano' as const;

/**
 * RealFi config for the wallet's active Cardano network, sourced from the
 * `REALFI` feature-flag payload (live — a CMS update applies on the next
 * feature-flag refresh), falling back to the compile-time preview default.
 * `undefined` when RealFi is not configured for the active network, which
 * components render as an "unavailable on this network" state and use to skip all
 * RealFi fetches + token lookups (ADR 11).
 */
export const useActiveRealFiConfig = (): RealFiNetworkConfig | undefined => {
  const activeNetworkId = useLaceSelector(
    'network.selectActiveNetworkId',
    CARDANO,
  );
  const loadedFeatures = useLaceSelector('features.selectLoadedFeatures');
  return useMemo(
    () =>
      getRealFiConfigFromFlags(
        loadedFeatures?.featureFlags ?? [],
        activeNetworkId,
      ),
    [loadedFeatures, activeNetworkId],
  );
};
