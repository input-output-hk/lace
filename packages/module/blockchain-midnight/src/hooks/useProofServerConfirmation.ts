import {
  isSameProofServerMode,
  proofServerDisclosureKey,
} from '@lace-contract/midnight-context';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useDispatchLaceAction, useLaceSelector } from './lace-context';

import type {
  MidnightSDKNetworkId,
  ProofServerMode,
} from '@lace-contract/midnight-context';

type Props = {
  networkId: MidnightSDKNetworkId;
  mode: ProofServerMode;
  availableModes: ProofServerMode[];
  isOpen: boolean;
  isSaving: boolean;
  onSave: () => void;
};

/** The settings Save button requests consent; only the affirmative action
 * persists a custom or delegated choice. The same hook serves monolith and guest UI. */
export const useProofServerConfirmation = ({
  networkId,
  mode,
  availableModes,
  isOpen,
  isSaving,
  onSave,
}: Props) => {
  const acknowledgements = useLaceSelector(
    'midnightContext.selectProofServerDisclosureAcknowledgements',
  );
  const acknowledge = useDispatchLaceAction(
    'midnightContext.acknowledgeProofServerDisclosure',
  );
  const [pending, setPending] = useState<{
    networkId: MidnightSDKNetworkId;
    mode: ProofServerMode;
  }>();
  const key = proofServerDisclosureKey(mode);
  const canSave =
    isOpen &&
    !isSaving &&
    availableModes.some(candidate => isSameProofServerMode(candidate, mode));
  const isPendingValid =
    canSave &&
    pending?.networkId === networkId &&
    isSameProofServerMode(pending.mode, mode);

  // A network, provider or availability change invalidates a displayed decision.
  useEffect(() => {
    if (pending && !isPendingValid) setPending(undefined);
  }, [pending, isPendingValid]);

  const confirmation = useMemo(
    () =>
      isPendingValid && key
        ? {
            isCustom: mode.kind === 'local-host',
            provider: 'label' in mode ? mode.label : undefined,
            isFirstUse: acknowledgements?.[key] !== true,
          }
        : undefined,
    [isPendingValid, key, mode, acknowledgements],
  );
  const requestSave = useCallback(() => {
    if (!canSave) return;
    if (key) setPending({ networkId, mode });
    else onSave();
  }, [canSave, key, networkId, mode, onSave]);
  const confirm = useCallback(() => {
    if (!isPendingValid || !key) return;
    acknowledge(mode);
    setPending(undefined);
    onSave();
  }, [isPendingValid, key, acknowledge, mode, onSave]);
  const cancel = useCallback(() => {
    setPending(undefined);
  }, []);

  return { confirmation, requestSave, confirm, cancel };
};
