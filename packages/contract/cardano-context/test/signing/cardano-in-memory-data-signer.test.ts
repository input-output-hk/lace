import { AuthenticationCancelledError } from '@lace-contract/signer';
import { firstValueFrom, of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { CardanoInMemoryDataSigner } from '../../src/signing/cardano-in-memory-data-signer';

import type { WithCardanoKeyAgent$ } from '../../src/signing/cardano-in-memory-transaction-signer';
import type { CardanoKeyAgent } from '../../src/signing/types';
import type { Cardano } from '@cardano-sdk/core';
import type { Ed25519KeyHashHex } from '@cardano-sdk/crypto';
import type { SignerAuth } from '@lace-contract/signer';
import type { Observable } from 'rxjs';

const STUB_DREP_KEY_HASH = 'cd'.repeat(28) as Ed25519KeyHashHex;

vi.mock('../../src/signing/cip8-sign-data', () => ({
  cip8SignData: vi
    .fn()
    .mockResolvedValue({ signature: 'sig-hex', key: 'key-hex' }),
}));

const createMockAuth = (): SignerAuth => ({
  authenticate: vi.fn().mockReturnValue(of(true)),
  accessAuthSecret: vi.fn(),
});

describe('CardanoInMemoryDataSigner', () => {
  it('triggers auth, resolves the key agent, and calls cip8SignData', async () => {
    const keyAgent: CardanoKeyAgent = {
      signTransaction: vi.fn(),
      signBlob: vi.fn(),
    };
    const withKeyAgent$ = vi.fn(
      (use: (keyAgent: CardanoKeyAgent) => Observable<unknown>) =>
        use(keyAgent),
    ) as unknown as WithCardanoKeyAgent$;

    const auth = createMockAuth();
    const signer = new CardanoInMemoryDataSigner({
      withKeyAgent$,
      dRepKeyHash$: of(STUB_DREP_KEY_HASH),
      knownAddresses: [],
      auth,
    });

    const result = await firstValueFrom(
      signer.signData({
        signWith: 'addr_test1qz...' as Cardano.PaymentAddress,
        payload: 'deadbeef',
      }),
    );

    expect(auth.authenticate).toHaveBeenCalled();
    expect(withKeyAgent$).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ signature: 'sig-hex', key: 'key-hex' });
  });

  it('forwards the pre-derived DRep key hash to cip8SignData (LW-14940)', async () => {
    const { cip8SignData } = await import('../../src/signing/cip8-sign-data');
    vi.mocked(cip8SignData).mockClear();

    const keyAgent: CardanoKeyAgent = {
      signTransaction: vi.fn(),
      signBlob: vi.fn(),
    };
    const knownAddresses = [{ address: 'addr_test1...' }] as never;
    const withKeyAgent$ = vi.fn(
      (use: (keyAgent: CardanoKeyAgent) => Observable<unknown>) =>
        use(keyAgent),
    ) as unknown as WithCardanoKeyAgent$;
    const signer = new CardanoInMemoryDataSigner({
      withKeyAgent$,
      dRepKeyHash$: of(STUB_DREP_KEY_HASH),
      knownAddresses,
      auth: createMockAuth(),
    });

    const request = {
      signWith: 'addr_test1qz...' as Cardano.PaymentAddress,
      payload: 'deadbeef',
    };
    await firstValueFrom(signer.signData(request));

    expect(cip8SignData).toHaveBeenCalledWith({
      keyAgent,
      request,
      knownAddresses,
      dRepKeyHash: STUB_DREP_KEY_HASH,
    });
  });

  it('propagates signing errors', async () => {
    const { cip8SignData } = await import('../../src/signing/cip8-sign-data');
    vi.mocked(cip8SignData).mockRejectedValueOnce(
      new Error('COSE construction failed'),
    );

    const keyAgent: CardanoKeyAgent = {
      signTransaction: vi.fn(),
      signBlob: vi.fn(),
    };

    const withKeyAgent$ = vi.fn(
      (use: (keyAgent: CardanoKeyAgent) => Observable<unknown>) =>
        use(keyAgent),
    ) as unknown as WithCardanoKeyAgent$;
    const signer = new CardanoInMemoryDataSigner({
      withKeyAgent$,
      dRepKeyHash$: of(STUB_DREP_KEY_HASH),
      knownAddresses: [],
      auth: createMockAuth(),
    });

    await expect(
      firstValueFrom(
        signer.signData({
          signWith: 'addr_test1qz...' as Cardano.PaymentAddress,
          payload: 'deadbeef',
        }),
      ),
    ).rejects.toThrow('COSE construction failed');
  });

  it('throws AuthenticationCancelledError when the user cancels auth', async () => {
    const auth: SignerAuth = {
      authenticate: vi.fn().mockReturnValue(of(false)),
      accessAuthSecret: vi.fn(),
    };
    const withKeyAgent$: WithCardanoKeyAgent$ = vi.fn();

    const signer = new CardanoInMemoryDataSigner({
      withKeyAgent$,
      dRepKeyHash$: of(STUB_DREP_KEY_HASH),
      knownAddresses: [],
      auth,
    });

    await expect(
      firstValueFrom(
        signer.signData({
          signWith: 'addr_test1qz...' as Cardano.PaymentAddress,
          payload: 'deadbeef',
        }),
      ),
    ).rejects.toThrow(AuthenticationCancelledError);
    expect(withKeyAgent$).not.toHaveBeenCalled();
  });
});
