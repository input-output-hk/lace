import { useCallback, useMemo, useState } from 'react';

import type { HardwareWalletDeviceMetadata } from './types';
import type { HardwareIntegrationId } from '../value-objects/hardware-integration-id.vo';
import type { BlockchainName } from '@lace-lib/util-store';

/** A blockchain a hardware wallet type can be set up for, keyed by the option that handles it. */
export interface HwBlockchainChoice {
  blockchainName: BlockchainName;
  optionId: HardwareIntegrationId;
}

export interface HwBlockchainSelectionProceedParams<Context> {
  optionId: HardwareIntegrationId;
  blockchainName: BlockchainName;
  context: Context;
}

export interface UseHwBlockchainSelectionProps<Context> {
  /**
   * Invoked with the resolved blockchain choice, either immediately (single
   * supported blockchain) or after the user picks one from the list. Callers
   * navigate to their own setup destination here.
   */
  onProceed: (params: HwBlockchainSelectionProceedParams<Context>) => void;
}

export interface UseHwBlockchainSelectionResult<Context> {
  /** True while the multi-blockchain picker should be shown instead of the device list. */
  isSelectingBlockchain: boolean;
  /** Blockchain choices mapped to the device-list item shape for reuse of the device picker UI. */
  blockchainDevices: HardwareWalletDeviceMetadata[];
  handleSelectBlockchain: (optionId: string) => void;
  resetBlockchainSelection: () => void;
  /**
   * Entry point: proceeds directly when exactly one blockchain is supported,
   * stores the choices and switches the UI into blockchain-selection mode when
   * there are several, and ignores the request when the list is empty. An
   * empty list means the hw-blockchain-support addons have not resolved yet
   * (they load asynchronously alongside the device options); proceeding would
   * require guessing a blockchain, so the caller retries once they load.
   */
  chooseBlockchainOrProceed: (params: {
    blockchains: HwBlockchainChoice[];
    /** @deprecated Unused; empty blockchain lists no longer proceed with a guessed option. */
    fallbackOptionId?: HardwareIntegrationId;
    context: Context;
  }) => void;
}

/**
 * State machine for the "which blockchain do you want to set this hardware
 * wallet up for?" step shared by onboarding and add-wallet flows. Loading the
 * hw-blockchain-support addons stays in the calling module (libs cannot use
 * module loaders); callers pass the resolved choices in.
 */
export const useHwBlockchainSelection = <Context>({
  onProceed,
}: UseHwBlockchainSelectionProps<Context>): UseHwBlockchainSelectionResult<Context> => {
  const [selection, setSelection] = useState<{
    context: Context;
    blockchains: HwBlockchainChoice[];
  } | null>(null);

  const chooseBlockchainOrProceed = useCallback(
    ({
      blockchains,
      context,
    }: {
      blockchains: HwBlockchainChoice[];
      fallbackOptionId?: HardwareIntegrationId;
      context: Context;
    }) => {
      if (blockchains.length > 1) {
        setSelection({ context, blockchains });
        return;
      }
      const [choice] = blockchains;
      if (!choice) return;
      onProceed({
        optionId: choice.optionId,
        blockchainName: choice.blockchainName,
        context,
      });
    },
    [onProceed],
  );

  const blockchainDevices = useMemo<HardwareWalletDeviceMetadata[]>(
    () =>
      (selection?.blockchains ?? []).map(blockchain => ({
        id: blockchain.optionId,
        name: blockchain.blockchainName,
        models: [blockchain.blockchainName],
        logo: blockchain.blockchainName,
      })),
    [selection],
  );

  const handleSelectBlockchain = useCallback(
    (optionId: string) => {
      if (!selection) return;
      const chosen = selection.blockchains.find(
        blockchain => blockchain.optionId === optionId,
      );
      if (!chosen) return;
      onProceed({
        optionId: chosen.optionId,
        blockchainName: chosen.blockchainName,
        context: selection.context,
      });
      setSelection(null);
    },
    [selection, onProceed],
  );

  const resetBlockchainSelection = useCallback(() => {
    setSelection(null);
  }, []);

  return {
    isSelectingBlockchain: selection !== null,
    blockchainDevices,
    handleSelectBlockchain,
    resetBlockchainSelection,
    chooseBlockchainOrProceed,
  };
};
