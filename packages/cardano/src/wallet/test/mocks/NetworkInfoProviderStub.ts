/* eslint-disable no-magic-numbers */
/* eslint-disable max-len */
import { Cardano, NetworkInfoProvider, Seconds, EraSummary } from '@cardano-sdk/core';
import { testnetEraSummaries } from '@cardano-sdk/util-dev';

export const mockedNetworkInfo: {
  network: {
    magic: number;
    eraSummaries: EraSummary[];
  };
  lovelaceSupply: {
    circulating: bigint;
    total: bigint;
  };
  stake: {
    active: bigint;
    live: bigint;
  };
} = {
  network: {
    magic: 1_097_911_063,
    eraSummaries: testnetEraSummaries
  },
  lovelaceSupply: {
    circulating: BigInt(42_064_399_450_423_723),
    total: BigInt(40_267_211_394_073_980)
  },
  stake: {
    active: BigInt(1_060_378_314_781_343),
    live: BigInt(15_001_884_895_856_815)
  }
};

const mockedLedgerTip: Cardano.Tip = {
  blockNo: Cardano.BlockNo(3_114_963),
  slot: Cardano.Slot(43_905_372),
  hash: Cardano.BlockId('0dbe461fb5f981c0d01615332b8666340eb1a692b3034f46bcb5f5ea4172b2ed')
};

const mockCurrentProtocolParameters = {
  coinsPerUtxoByte: 4310,
  maxValueSize: 5000,
  minFeeCoefficient: 44,
  minFeeConstant: 155_381,
  maxCollateralInputs: 1,
  maxTxSize: 16_384,
  minPoolCost: 340_000_000,
  poolDeposit: 500_000_000,
  protocolVersion: { major: 5, minor: 0 },
  stakeKeyDeposit: 2_000_000
} as Cardano.ProtocolParameters;

const mockGenesisParameters: Cardano.CompactGenesis = {
  activeSlotsCoefficient: 0.05,
  epochLength: 432_000,
  maxKesEvolutions: 62,
  maxLovelaceSupply: BigInt(45_000_000_000_000_000),
  networkMagic: 764_824_073,
  securityParameter: 2160,
  // eslint-disable-next-line new-cap
  slotLength: Seconds(1),
  slotsPerKesPeriod: 129_600,
  systemStart: new Date(1_506_203_091_000),
  updateQuorum: 5,
  networkId: 0
};

/**
 * Provider stub for testing
 *
 * returns NetworkProvider-compatible object
 */
export const networkInfoProviderStub = (): NetworkInfoProvider => ({
  lovelaceSupply: () => Promise.resolve(mockedNetworkInfo.lovelaceSupply),
  eraSummaries: () => Promise.resolve(mockedNetworkInfo.network.eraSummaries),
  stake: () => Promise.resolve(mockedNetworkInfo.stake),
  ledgerTip: () => Promise.resolve(mockedLedgerTip),
  protocolParameters: () => Promise.resolve(mockCurrentProtocolParameters),
  genesisParameters: () => Promise.resolve(mockGenesisParameters),
  healthCheck: () => Promise.resolve({ ok: true })
});
