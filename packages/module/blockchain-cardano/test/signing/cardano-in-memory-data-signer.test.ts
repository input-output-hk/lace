import { Cardano } from '@cardano-sdk/core';
import { AuthenticationCancelledError } from '@lace-contract/signer';
import { firstValueFrom, of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { CardanoInMemoryDataSigner } from '../../src/signing/cardano-in-memory-data-signer';

import type { Bip32PublicKeyHex } from '@cardano-sdk/crypto';
import type {
  CardanoKeyAgent,
  CardanoSignerProps,
  CreateCardanoKeyAgent,
} from '@lace-contract/cardano-context';
import type { SignerAuth } from '@lace-contract/signer';
import type { HexBytes } from '@lace-sdk/util';

vi.mock('../../src/signing/cip8-sign-data', () => ({
  cip8SignData: vi
    .fn()
    .mockResolvedValue({ signature: 'sig-hex', key: 'key-hex' }),
}));

const mockAuthSecret = new Uint8Array([1, 2, 3]);

const createMockAuth = (authSecret: Uint8Array): SignerAuth => ({
  authenticate: vi.fn().mockReturnValue(of(true)),
  accessAuthSecret: vi
    .fn()
    .mockImplementation(
      <T>(callback: (secret: Uint8Array) => T): T => callback(authSecret),
    ),
});

const mockProps: CardanoSignerProps = {
  createKeyAgent: vi.fn(),
  accountIndex: 0,
  chainId: Cardano.ChainIds.Preprod,
  extendedAccountPublicKey: 'abcd' as unknown as Bip32PublicKeyHex,
  encryptedRootPrivateKey: 'beef' as HexBytes,
  knownAddresses: [],
  auth: createMockAuth(mockAuthSecret),
};

describe('CardanoInMemoryDataSigner', () => {
  it('triggers auth, accesses secret, and calls cip8SignData', async () => {
    const mockKeyAgent: CardanoKeyAgent = {
      signTransaction: vi.fn(),
      signBlob: vi.fn(),
    };
    const createKeyAgent: CreateCardanoKeyAgent = vi
      .fn()
      .mockResolvedValue(mockKeyAgent);

    const auth = createMockAuth(mockAuthSecret);
    const signer = new CardanoInMemoryDataSigner({
      ...mockProps,
      createKeyAgent,
      auth,
    });

    const result = await firstValueFrom(
      signer.signData({
        signWith: 'addr_test1qz...' as Cardano.PaymentAddress,
        payload: 'deadbeef',
      }),
    );

    expect(auth.authenticate).toHaveBeenCalled();
    expect(auth.accessAuthSecret).toHaveBeenCalled();
    expect(createKeyAgent).toHaveBeenCalledWith(
      expect.objectContaining({ authSecret: mockAuthSecret }),
    );
    expect(result).toEqual({ signature: 'sig-hex', key: 'key-hex' });
  });

  it('propagates signing errors', async () => {
    const { cip8SignData } = await import('../../src/signing/cip8-sign-data');
    vi.mocked(cip8SignData).mockRejectedValueOnce(
      new Error('COSE construction failed'),
    );

    const mockKeyAgent: CardanoKeyAgent = {
      signTransaction: vi.fn(),
      signBlob: vi.fn(),
    };
    const createKeyAgent: CreateCardanoKeyAgent = vi
      .fn()
      .mockResolvedValue(mockKeyAgent);

    const signer = new CardanoInMemoryDataSigner({
      ...mockProps,
      createKeyAgent,
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

  it('throws AuthenticationCancelledError when user cancels auth', async () => {
    const auth: SignerAuth = {
      authenticate: vi.fn().mockReturnValue(of(false)),
      accessAuthSecret: vi.fn(),
    };

    const signer = new CardanoInMemoryDataSigner({
      ...mockProps,
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
    expect(auth.accessAuthSecret).not.toHaveBeenCalled();
  });
});
