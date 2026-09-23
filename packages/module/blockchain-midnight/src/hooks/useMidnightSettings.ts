import { useLaceSelector, useDispatchLaceAction } from './lace-context';

import type { MidnightSDKNetworkId } from '@lace-contract/midnight-context';

type ProveServerOptionVariant = 'local' | 'remote';

export type ProveServerOption = {
  url: string;
  variant: ProveServerOptionVariant;
};

export const createProveServerOptions = ({
  localProofServerAddress,
  remoteProofServerAddress,
}: {
  localProofServerAddress: string;
  remoteProofServerAddress?: string;
}): ProveServerOption[] => {
  let options: ProveServerOption[] = [
    {
      url: localProofServerAddress,
      variant: 'local',
    },
  ];

  if (remoteProofServerAddress) {
    const remoteOption: ProveServerOption = {
      url: remoteProofServerAddress,
      variant: 'remote',
    };
    options = [remoteOption, ...options];
  }

  return options;
};

export const useMidnightSettings = () => {
  // Selectors
  const networkId = useLaceSelector('midnightContext.selectNetworkId');
  const networksConfig = useLaceSelector(
    'midnightContext.selectNetworksConfig',
  );
  const defaultNetworksConfig = useLaceSelector(
    'midnightContext.selectNetworksDefaultConfig',
  );
  const featureFlagsOverrides = useLaceSelector(
    'midnightContext.selectNetworksConfigFeatureFlagsOverrides',
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

  // Helper to get prove server options for a specific network.
  //
  // remoteProofServerAddress currently resolves to undefined for every network:
  // the Shielded remote proof servers were retired (LW-15058) and no flag
  // supplies proofServerAddress any more, so only the local option is offered.
  // The seam is kept rather than collapsed because further proving providers are
  // in flight (TEE, Confidential Space, zkPaaS) — feeding one an address here is
  // all it takes to bring the radio list back.
  const getProveServerOptions = (targetNetworkId: MidnightSDKNetworkId) =>
    createProveServerOptions({
      localProofServerAddress:
        defaultNetworksConfig[targetNetworkId].proofServerAddress,
      remoteProofServerAddress:
        featureFlagsOverrides[targetNetworkId]?.proofServerAddress,
    });

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
    getProveServerOptions,
  };
};
