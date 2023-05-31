/* eslint-disable no-magic-numbers */
/* eslint-disable camelcase */
import { KoraLabsHandleProvider } from './provider';
import { Wallet } from '@lace/cardano';
import { createGenericMockServer } from '@cardano-sdk/util-dev';

const bobHandle = {
  name: 'bob',
  hasDatum: false,
  resolved_addresses: {
    ada: 'addr_test1qzrljm7nskakjydxlr450ktsj08zuw6aktvgfkmmyw9semrkrezryq3ydtmkg0e7e2jvzg443h0ffzfwd09wpcxy2fuql9tk0g'
  }
};

const aliceHandle = {
  name: 'alice',
  hasDatum: false,
  resolved_addresses: {
    ada: 'addr_test1qqk4sr4f7vtqzd2w90d5nfu3n59jhhpawyphnek2y7er02nkrezryq3ydtmkg0e7e2jvzg443h0ffzfwd09wpcxy2fuqmcnecd'
  }
};

export const mockServer = createGenericMockServer((handler) => async (req, res) => {
  const result = await handler(req);
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.statusCode = result.code || 200;
  return res.end(JSON.stringify(result.body));
});

describe('HandleProvider', () => {
  it('should resolve a handle', async () => {
    const { serverUrl, closeMock } = await mockServer(async () => ({
      body: bobHandle
    }));
    const provider = new KoraLabsHandleProvider({
      networkInfoProvider: Wallet.mockUtils.networkInfoProviderStub(),
      serverUrl
    });
    const tip = await Wallet.mockUtils.networkInfoProviderStub().ledgerTip();
    const result = await provider.resolveHandles({ handles: ['bob'] });
    expect(result[0].handle).toEqual('bob');
    expect(result[0].resolvedAddresses.cardano).toEqual(bobHandle.resolved_addresses.ada);
    expect(result[0].hasDatum).toEqual(false);
    expect(result[0].resolvedAt.hash).toEqual(tip.hash);
    expect(result[0].resolvedAt.slot).toEqual(tip.slot);
    await closeMock();
  });

  it('should resolve multiple handles', async () => {
    const { serverUrl, closeMock } = await mockServer(async (req) =>
      req.url === '/handles/bob' ? { body: bobHandle } : { body: aliceHandle }
    );
    const provider = new KoraLabsHandleProvider({
      networkInfoProvider: Wallet.mockUtils.networkInfoProviderStub(),
      serverUrl
    });
    const result = await provider.resolveHandles({ handles: ['bob', 'alice'] });
    expect(result[0].handle).toEqual('bob');
    expect(result[1].handle).toEqual('alice');
    await closeMock();
  });

  it('should get ok health check', async () => {
    const { serverUrl, closeMock } = await mockServer(async () => ({
      body: { ok: true }
    }));
    const provider = new KoraLabsHandleProvider({
      networkInfoProvider: Wallet.mockUtils.networkInfoProviderStub(),
      serverUrl
    });
    const result = await provider.healthCheck();
    expect(result.ok).toEqual(true);
    await closeMock();
  });

  it('should get not ok health check', async () => {
    const provider = new KoraLabsHandleProvider({
      networkInfoProvider: Wallet.mockUtils.networkInfoProviderStub(),
      serverUrl: ''
    });
    const result = await provider.healthCheck();
    expect(result.ok).toEqual(false);
  });
});
