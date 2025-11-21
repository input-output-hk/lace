import { DRepProvider, DRepInfo, Cardano } from '@cardano-sdk/core';

const mockDRepInfo: DRepInfo = {
  id: Cardano.DRepID('drep1vpzcgfrlgdh4fft0p0ju70czkxxkuknw0jjztl3x7aqgm9q3hqyaz'),
  amount: BigInt(0),
  active: true,
  activeEpoch: Cardano.EpochNo(1),
  hasScript: false
};

export const dRepProviderStub = (): DRepProvider => ({
  getDRepInfo: jest.fn().mockResolvedValue(mockDRepInfo),
  getDRepsInfo: jest.fn().mockResolvedValue([mockDRepInfo]),
  healthCheck: jest.fn().mockResolvedValue({ ok: true })
});
