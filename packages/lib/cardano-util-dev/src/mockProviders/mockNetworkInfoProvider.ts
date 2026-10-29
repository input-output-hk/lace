import { vi } from 'vitest';

import { testnetEraSummaries } from '../eraSummaries';

import { genesisParameters, ledgerTip, protocolParameters } from './mockData';

export const networkInfo = {
  lovelaceSupply: {
    circulating: 42_064_399_450_423_723n,
    total: 40_267_211_394_073_980n,
  },
  network: {
    eraSummaries: testnetEraSummaries,
    magic: 1_097_911_063,
  },
  stake: {
    active: 1_060_378_314_781_343n,
    live: 15_001_884_895_856_815n,
  },
};

/** Provider stub for testing */
export const mockNetworkInfoProvider = () => ({
  eraSummaries: vi.fn().mockResolvedValue(networkInfo.network.eraSummaries),
  genesisParameters: vi.fn().mockResolvedValue(genesisParameters),
  healthCheck: vi.fn().mockResolvedValue({ ok: true }),
  ledgerTip: vi.fn().mockResolvedValue(ledgerTip),
  lovelaceSupply: vi.fn().mockResolvedValue(networkInfo.lovelaceSupply),
  protocolParameters: vi.fn().mockResolvedValue(protocolParameters),
  stake: vi.fn().mockResolvedValue(networkInfo.stake),
});

export type NetworkInfoProviderStub = ReturnType<
  typeof mockNetworkInfoProvider
>;
