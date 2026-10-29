import { Cardano } from '@lace-lib/cardano-core';
import delay from 'delay';
import { vi } from 'vitest';

import { genesisParameters, ledgerTip, protocolParameters } from './mockData';
import { networkInfo } from './mockNetworkInfoProvider';

export const protocolParameters2 = {
  ...protocolParameters,
  maxCollateralInputs: protocolParameters.maxCollateralInputs + 1,
};

export const genesisParameters2 = {
  ...genesisParameters,
  maxLovelaceSupply: genesisParameters.maxLovelaceSupply + 1n,
};

export const ledgerTip2 = {
  ...ledgerTip,
  blockNo: Cardano.BlockNo(ledgerTip.blockNo + 1),
};

/**
 * A different provider stub for testing, supports delay to simulate network requests.
 *
 * @returns NetworkInfoProvider that returns data that is slightly different to mockNetworkInfoProvider.
 */
export const mockNetworkInfoProvider2 = (delayMs: number) => {
  const delayedJestFn = <T>(resolvedValue: T) =>
    vi.fn().mockImplementation(() => delay(delayMs).then(() => resolvedValue));

  return {
    eraSummaries: vi.fn().mockResolvedValue(networkInfo.network.eraSummaries),
    genesisParameters: delayedJestFn(genesisParameters2),
    healthCheck: delayedJestFn({ ok: true }),
    ledgerTip: delayedJestFn(ledgerTip2),
    lovelaceSupply: vi.fn().mockResolvedValue(networkInfo.lovelaceSupply),
    protocolParameters: delayedJestFn(protocolParameters2),
    stake: vi.fn().mockResolvedValue(networkInfo.stake),
  };
};
