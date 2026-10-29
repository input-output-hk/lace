import { util } from '../../src';
import { testKeyAgent } from '../mocks';

import type { KeyAgent } from '../../src';

describe('createAsyncKeyAgent', () => {
  let keyAgent: KeyAgent;

  beforeAll(async () => {
    keyAgent = await testKeyAgent();
  });

  it('exposes the key agent properties as promises', async () => {
    const asyncKeyAgent = util.createAsyncKeyAgent(keyAgent);
    await expect(asyncKeyAgent.getAccountIndex()).resolves.toBe(
      keyAgent.accountIndex,
    );
    await expect(asyncKeyAgent.getChainId()).resolves.toEqual(keyAgent.chainId);
    await expect(asyncKeyAgent.getBip32Ed25519()).resolves.toBe(
      keyAgent.bip32Ed25519,
    );
    await expect(asyncKeyAgent.getExtendedAccountPublicKey()).resolves.toBe(
      keyAgent.extendedAccountPublicKey,
    );
  });

  it('shutdown calls the callback once, and is safe without one', () => {
    const onShutdown = vi.fn();
    util.createAsyncKeyAgent(keyAgent, onShutdown).shutdown();
    expect(onShutdown).toHaveBeenCalledTimes(1);
    expect(() => util.createAsyncKeyAgent(keyAgent).shutdown()).not.toThrow();
  });
});
