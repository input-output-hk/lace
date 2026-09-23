import { beforeEach, describe, expect, it, vi } from 'vitest';

import { applyNetworkId } from '../../src/infra/network-id';

const networkIdMocks = vi.hoisted(() => ({
  setNetworkId: vi.fn(),
}));

vi.mock('@midnight-ntwrk/midnight-js-network-id', () => ({
  setNetworkId: networkIdMocks.setNetworkId,
}));

describe('applyNetworkId', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('applies the given network id to the midnight libraries', async () => {
    await applyNetworkId('undeployed');

    expect(networkIdMocks.setNetworkId).toHaveBeenCalledExactlyOnceWith(
      'undeployed',
    );
  });

  it('applies a later different network id instead of a cached one', async () => {
    await applyNetworkId('undeployed');
    await applyNetworkId('testnet-02');

    expect(networkIdMocks.setNetworkId.mock.calls).toEqual([
      ['undeployed'],
      ['testnet-02'],
    ]);
  });
});
