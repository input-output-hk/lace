import { useLaceSelector, useDispatchLaceAction } from './lace-context';

import type {
  MidnightSDKNetworkId,
  ProofServerMode,
} from '@lace-contract/midnight-context';

/**
 * Trust-tier grouping used by the settings UI. The boundary that matters
 * for a wallet is where the private material goes:
 *  - `on-device`   — proofs run in the wallet
 *  - `custom`      — proofs use a user-configured server
 *  - `paired`      — proofs run on another device the user owns
 *  - `delegated`   — proofs run on a third-party server
 */
export type ProofServerTier = 'custom' | 'delegated' | 'on-device' | 'paired';

export type ProofServerSection = {
  tier: ProofServerTier;
  modes: ProofServerMode[];
};

const tierForMode = (mode: ProofServerMode): ProofServerTier => {
  switch (mode.kind) {
    case 'in-process':
      return 'on-device';
    case 'local-host':
      return 'custom';
    case 'paired-device':
      return 'paired';
    case 'delegated':
    case 'tee-delegated':
      return 'delegated';
  }
};

/**
 * Deterministic ordering inside the delegated tier — no label matching:
 * attested options first, then other admitted remote providers.
 * Catalogue order is preserved within each rank.
 */
const delegatedRank = (mode: ProofServerMode): number => {
  if (mode.kind === 'tee-delegated') return 0;
  return 1;
};

/**
 * Groups modes into trust-tier sections, preserving the order modes were
 * provided in (except the delegated tier, which is ranked — see
 * {@link delegatedRank}). Sections with no modes are dropped so the UI
 * doesn't render empty headers (e.g. "On your devices" stays hidden until
 * pairing lands).
 */
export const groupProofServerModesByTier = (
  modes: ProofServerMode[],
): ProofServerSection[] => {
  const byTier = new Map<ProofServerTier, ProofServerMode[]>();
  for (const mode of modes) {
    const tier = tierForMode(mode);
    const list = byTier.get(tier) ?? [];
    list.push(mode);
    byTier.set(tier, list);
  }
  const delegated = byTier.get('delegated');
  if (delegated) {
    byTier.set(
      'delegated',
      [...delegated].sort((a, b) => delegatedRank(a) - delegatedRank(b)),
    );
  }
  const orderedTiers: ProofServerTier[] = [
    'on-device',
    'paired',
    'delegated',
    'custom',
  ];
  return orderedTiers
    .filter(tier => byTier.has(tier))
    .map(tier => ({ tier, modes: byTier.get(tier)! }));
};

export const useMidnightSettings = () => {
  // Selectors
  const networkId = useLaceSelector('midnightContext.selectNetworkId');
  const networksConfig = useLaceSelector(
    'midnightContext.selectNetworksConfig',
  );
  const allProofServerModes = useLaceSelector(
    'midnightContext.selectAllProofServerModes',
  );
  const supportedNetworkIds = useLaceSelector(
    'midnightContext.selectSupportedNetworksIds',
  );
  const settingsDrawerState = useLaceSelector(
    'midnight.selectSettingsDrawerState',
  );

  // Actions
  const openSettings = useDispatchLaceAction('midnight.openSettings', true);
  const closeSettings = useDispatchLaceAction('midnight.closeSettings', true);
  const confirmSettings = useDispatchLaceAction('midnight.confirmSettings');
  // Derived state
  const isOpen = ['Open', 'Saving'].includes(settingsDrawerState.status);
  const isSaving = settingsDrawerState.status === 'Saving';

  /** Tier-grouped modes for the given network — drives the radio-group UI. */
  const getProofServerSections = (
    targetNetworkId: MidnightSDKNetworkId,
  ): ProofServerSection[] =>
    groupProofServerModesByTier(allProofServerModes[targetNetworkId] ?? []);

  return {
    // State
    networkId,
    networksConfig,
    supportedNetworkIds,
    isOpen,
    isSaving,

    // Actions
    openSettings,
    closeSettings,
    save: confirmSettings,

    // Helpers
    getProofServerSections,
  };
};
