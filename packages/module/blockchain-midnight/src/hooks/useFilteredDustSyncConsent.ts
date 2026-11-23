import { isSameProofServerMode } from '@lace-contract/midnight-context';
import { useCallback, useEffect, useState } from 'react';

import type {
  MidnightSDKNetworkId,
  ProofServerMode,
} from '@lace-contract/midnight-context';

type Props = {
  networkId: MidnightSDKNetworkId;
  indexerAddress: string;
  proofServer: ProofServerMode;
  availableProofServerModes: ProofServerMode[];
  isOpen: boolean;
  isSaving: boolean;
  isRolloutEnabled: boolean;
  isSelected: boolean;
  hasSettingChanged: boolean;
  onSave: () => void;
};

/** Consent applies only to the settings displayed when the user requested Save. */
export const useFilteredDustSyncConsent = ({
  networkId,
  indexerAddress,
  proofServer,
  availableProofServerModes,
  isOpen,
  isSaving,
  isRolloutEnabled,
  isSelected,
  hasSettingChanged,
  onSave,
}: Props) => {
  const [pendingConsent, setPendingConsent] = useState<{
    networkId: MidnightSDKNetworkId;
    indexerAddress: string;
    proofServer: ProofServerMode;
  }>();
  const canSave =
    isOpen &&
    !isSaving &&
    availableProofServerModes.some(mode =>
      isSameProofServerMode(mode, proofServer),
    );
  const isConsentRequired = isSelected && hasSettingChanged;
  const isAwaitingConsent =
    !!pendingConsent &&
    canSave &&
    isRolloutEnabled &&
    isConsentRequired &&
    pendingConsent.networkId === networkId &&
    pendingConsent.indexerAddress === indexerAddress &&
    isSameProofServerMode(pendingConsent.proofServer, proofServer);

  useEffect(() => {
    if (pendingConsent && !isAwaitingConsent) setPendingConsent(undefined);
  }, [pendingConsent, isAwaitingConsent]);

  const requestSave = useCallback(() => {
    if (!canSave) return;
    if (isConsentRequired) {
      if (!isRolloutEnabled) return;
      setPendingConsent({ networkId, indexerAddress, proofServer });
    } else onSave();
  }, [
    canSave,
    isConsentRequired,
    isRolloutEnabled,
    networkId,
    indexerAddress,
    proofServer,
    onSave,
  ]);
  const confirm = useCallback(() => {
    if (!isAwaitingConsent) return;
    setPendingConsent(undefined);
    onSave();
  }, [isAwaitingConsent, onSave]);
  const cancel = useCallback(() => {
    setPendingConsent(undefined);
  }, []);
  return { isAwaitingConsent, requestSave, confirm, cancel };
};
