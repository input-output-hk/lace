import { AuthenticationCancelledError } from '@lace-contract/signer';
import { firstValueFrom, of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BitcoinInMemoryDataSigner } from '../../src/signing/bitcoin-in-memory-data-signer';

import type {
  BitcoinNetwork,
  BitcoinSignDataRequest,
} from '@lace-contract/bitcoin-context';
import type { SignerAuth } from '@lace-contract/signer';
import type { HexBytes } from '@lace-lib/util';

vi.mock('@lace-lib/core', () => ({
  SecretBox: { open: vi.fn().mockResolvedValue(new Uint8Array(64)) },
}));

vi.mock('../../src/common', () => ({
  deriveAccountRootKeyPair: vi.fn().mockReturnValue({
    pair: { publicKey: 'xpub-mock', privateKey: 'xprv-mock' },
    path: "m/84'/0'/0'",
  }),
  deriveChildKeyPair: vi.fn().mockReturnValue({
    pair: {
      publicKey: 'aa'.repeat(33),
      privateKey: 'bb'.repeat(32),
    },
    path: 'm/0/0',
  }),
  AddressType: { NativeSegWit: 'nativeSegWit' },
  ChainType: { External: 'external' },
}));

vi.mock('bitcoinjs-lib', () => ({
  networks: { bitcoin: {}, testnet: {} },
  payments: {
    p2wpkh: vi.fn().mockReturnValue({
      address: 'bc1q9vza2e8x573nczrlzms0wvx3gsqjx7vavgkx0l',
    }),
  },
}));

vi.mock('../../src/signing/bip137-sign-message', () => ({
  bip137SignMessage: vi.fn().mockReturnValue({ signature: 'c0ffee' }),
}));

vi.mock('../../src/signing/bip322-sign-data', () => ({
  bip322SignData: vi.fn().mockReturnValue({ signature: 'deadbeef' }),
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

const MOCK_REQUEST: BitcoinSignDataRequest = {
  address: 'bc1q9vza2e8x573nczrlzms0wvx3gsqjx7vavgkx0l',
  message: 'Hello World',
};

describe('BitcoinInMemoryDataSigner', () => {
  const createSigner = (auth: SignerAuth) =>
    new BitcoinInMemoryDataSigner({
      encryptedRootPrivateKey: 'beef' as HexBytes,
      auth,
      network: 'mainnet' as BitcoinNetwork,
      accountIndex: 0,
    });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Happy path: triggers authentication, accesses secret, decrypts key,
  // derives P2WPKH signing key, and returns the signature
  it('triggers auth, accesses secret, and signs data', async () => {
    const auth = createMockAuth(true);
    const signer = createSigner(auth);

    const result = await firstValueFrom(signer.signData(MOCK_REQUEST));

    expect(auth.authenticate).toHaveBeenCalled();
    expect(auth.accessAuthSecret).toHaveBeenCalled();
    expect(result).toEqual({ signature: 'c0ffee' });
  });

  // dApps that omit signatureType expect the BIP-137 compact ECDSA scheme
  it('dispatches to BIP-137 ECDSA signing when signatureType is absent', async () => {
    const { bip137SignMessage } = await import(
      '../../src/signing/bip137-sign-message'
    );
    const { bip322SignData } = await import(
      '../../src/signing/bip322-sign-data'
    );
    const signer = createSigner(createMockAuth(true));

    const result = await firstValueFrom(signer.signData(MOCK_REQUEST));

    expect(bip137SignMessage).toHaveBeenCalledWith(
      expect.objectContaining({ privateKey: expect.any(Buffer) as Buffer }),
      MOCK_REQUEST,
    );
    expect(bip322SignData).not.toHaveBeenCalled();
    expect(result).toEqual({ signature: 'c0ffee' });
  });

  it('dispatches to BIP-137 ECDSA signing when signatureType is ecdsa', async () => {
    const { bip137SignMessage } = await import(
      '../../src/signing/bip137-sign-message'
    );
    const signer = createSigner(createMockAuth(true));
    const request: BitcoinSignDataRequest = {
      ...MOCK_REQUEST,
      signatureType: 'ecdsa',
    };

    const result = await firstValueFrom(signer.signData(request));

    expect(bip137SignMessage).toHaveBeenCalledWith(
      expect.objectContaining({ privateKey: expect.any(Buffer) as Buffer }),
      request,
    );
    expect(result).toEqual({ signature: 'c0ffee' });
  });

  it('dispatches to BIP-322 signing when signatureType is bip322-simple', async () => {
    const { bip137SignMessage } = await import(
      '../../src/signing/bip137-sign-message'
    );
    const { bip322SignData } = await import(
      '../../src/signing/bip322-sign-data'
    );
    const signer = createSigner(createMockAuth(true));
    const request: BitcoinSignDataRequest = {
      ...MOCK_REQUEST,
      signatureType: 'bip322-simple',
    };

    const result = await firstValueFrom(signer.signData(request));

    expect(bip322SignData).toHaveBeenCalledWith(
      expect.objectContaining({ privateKey: expect.any(Buffer) as Buffer }),
      request,
    );
    expect(bip137SignMessage).not.toHaveBeenCalled();
    expect(result).toEqual({ signature: 'deadbeef' });
  });

  // When user cancels authentication, the signer must throw
  // AuthenticationCancelledError and never access the auth secret
  it.each([
    ['ecdsa', MOCK_REQUEST],
    [
      'bip322-simple',
      { ...MOCK_REQUEST, signatureType: 'bip322-simple' as const },
    ],
  ])(
    'throws AuthenticationCancelledError when user cancels auth (%s)',
    async (_type, request) => {
      const auth = createMockAuth(false);
      const signer = createSigner(auth);

      await expect(firstValueFrom(signer.signData(request))).rejects.toThrow(
        AuthenticationCancelledError,
      );
      expect(auth.accessAuthSecret).not.toHaveBeenCalled();
    },
  );

  // The observable must emit exactly one result and then complete,
  // matching the TransactionSigner behavior
  it('returns observable that completes after single emission', async () => {
    const auth = createMockAuth(true);
    const signer = createSigner(auth);

    const emissions: unknown[] = [];
    let didComplete = false;
    await new Promise<void>(resolve => {
      signer.signData(MOCK_REQUEST).subscribe({
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

  // When the derived key produces a different P2WPKH address than requested,
  // the signer must throw an explicit error rather than producing an
  // unverifiable signature with a mismatched key
  it.each([
    ['ecdsa', MOCK_REQUEST],
    [
      'bip322-simple',
      { ...MOCK_REQUEST, signatureType: 'bip322-simple' as const },
    ],
  ])(
    'throws when request address does not match derived key (%s)',
    async (_type, request) => {
      const { payments } = await import('bitcoinjs-lib');
      vi.mocked(payments.p2wpkh).mockReturnValueOnce({
        address: 'bc1qdifferentaddress',
      } as ReturnType<typeof payments.p2wpkh>);

      const auth = createMockAuth(true);
      const signer = createSigner(auth);

      await expect(firstValueFrom(signer.signData(request))).rejects.toThrow(
        'Address mismatch',
      );
    },
  );

  // When the signing function throws, the error must propagate
  // through the observable without being swallowed
  it('propagates BIP-137 signing errors', async () => {
    const { bip137SignMessage } = await import(
      '../../src/signing/bip137-sign-message'
    );
    vi.mocked(bip137SignMessage).mockImplementationOnce(() => {
      throw new Error('Signing failed');
    });

    const auth = createMockAuth(true);
    const signer = createSigner(auth);

    await expect(firstValueFrom(signer.signData(MOCK_REQUEST))).rejects.toThrow(
      'Signing failed',
    );
  });

  it('propagates BIP-322 signing errors', async () => {
    const { bip322SignData } = await import(
      '../../src/signing/bip322-sign-data'
    );
    vi.mocked(bip322SignData).mockImplementationOnce(() => {
      throw new Error('Signing failed');
    });

    const auth = createMockAuth(true);
    const signer = createSigner(auth);

    await expect(
      firstValueFrom(
        signer.signData({ ...MOCK_REQUEST, signatureType: 'bip322-simple' }),
      ),
    ).rejects.toThrow('Signing failed');
  });
});
