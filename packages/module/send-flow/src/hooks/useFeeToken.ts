import { useUICustomisation } from '@lace-contract/app';
import { useMemo } from 'react';

import { useLaceSelector } from '../hooks';

import type { BlockchainName } from '@lace-lib/util-store';

export type NativeTokenInfo = {
  tokenId: string;
  displayShortName: string;
  decimals: number;
};

/**
 * Returns native token info for the given blockchain (fee currency and display ticker).
 *
 * Native tokens are deterministic per blockchain/network (ADA for Cardano, BTC for Bitcoin, DUST for Midnight).
 * Each blockchain module provides this via `nativeTokenInfo` on send-flow sheet UI customisation.
 *
 * Returns undefined if customisation is not loaded.
 */
export const useFeeToken = (
  blockchainName: BlockchainName,
): NativeTokenInfo | undefined => {
  const networkType = useLaceSelector('network.selectNetworkType');

  const [customisation] = useUICustomisation(
    'addons.loadSendFlowSheetUICustomisations',
    { blockchainOfTheTransaction: blockchainName },
  );

  return useMemo(
    () => customisation?.nativeTokenInfo?.({ networkType }),
    [networkType, customisation],
  );
};
