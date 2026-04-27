import { AuthenticationCancelledError } from '@lace-contract/signer';
import { HexBytes } from '@lace-sdk/util';
import { firstValueFrom, of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { BitcoinInMemoryTransactionSigner } from '../../src/signing/bitcoin-in-memory-transaction-signer';

import type { SignerAuth } from '@lace-contract/signer';

vi.mock('@cardano-sdk/key-management', () => ({
  emip3decrypt: vi.fn().mockResolvedValue(new Uint8Array(64)),
}));

vi.mock('../../src/common', () => ({
  decodeUnsignedTxFromString: vi.fn().mockReturnValue({
    signers: [],
    network: 'mainnet',
  }),
  deriveAccountRootKeyPair: vi.fn(),
  deriveChildKeyPair: vi.fn(),
  tweakTaprootPrivateKey: vi.fn(),
  AddressType: { Taproot: 'taproot' },
}));

vi.mock('../../src/wallet', () => ({
  BitcoinSigner: vi.fn(),
  signTx: vi.fn().mockReturnValue({ hex: 'signed-hex' }),
}));

vi.mock('@lace-lib/util-redacted', () => ({
  Redacted: {
    make: vi.fn().mockImplementation((v: unknown) => v),
    value: vi.fn().mockImplementation((v: unknown) => v),
    unsafeWipe: vi.fn(),
  },
}));

const createMockAuth = (confirmed: boolean): SignerAuth => ({
  authenticate: vi.fn().mockReturnValue(of(confirmed)),
  accessAuthSecret: vi
    .fn()
    .mockImplementation(
      <T>(callback: (secret: Uint8Array) => T): T =>
        callback(new Uint8Array([1, 2, 3])),
    ),
});

describe('BitcoinInMemoryTransactionSigner', () => {
  it('triggers auth, accesses secret, and signs transaction', async () => {
    const auth = createMockAuth(true);
    const signer = new BitcoinInMemoryTransactionSigner({
      encryptedRootPrivateKey: 'beef' as HexBytes,
      auth,
    });

    const result = await firstValueFrom(
      signer.sign({ serializedTx: HexBytes('hex-encoded-psbt') }),
    );

    expect(auth.authenticate).toHaveBeenCalled();
    expect(auth.accessAuthSecret).toHaveBeenCalled();
    expect(result.serializedTx).toBe(
      HexBytes.fromUTF8('{"network":"mainnet","hex":"signed-hex"}'),
    );
  });

  it('returns observable that completes after emission', async () => {
    const auth = createMockAuth(true);
    const signer = new BitcoinInMemoryTransactionSigner({
      encryptedRootPrivateKey: 'beef' as HexBytes,
      auth,
    });

    const emissions: unknown[] = [];
    let didComplete = false;
    await new Promise<void>(resolve => {
      signer.sign({ serializedTx: HexBytes('hex-encoded-psbt') }).subscribe({
        next: v => emissions.push(v),
        complete: () => {
          didComplete = true;
          resolve();
        },
      });
    });

    expect(emissions).toHaveLength(1);
    expect(didComplete).toBe(true);
  });

  it('throws AuthenticationCancelledError when user cancels auth', async () => {
    const auth = createMockAuth(false);
    const signer = new BitcoinInMemoryTransactionSigner({
      encryptedRootPrivateKey: 'beef' as HexBytes,
      auth,
    });

    await expect(
      firstValueFrom(
        signer.sign({ serializedTx: HexBytes('hex-encoded-psbt') }),
      ),
    ).rejects.toThrow(AuthenticationCancelledError);
    expect(auth.accessAuthSecret).not.toHaveBeenCalled();
  });
});
