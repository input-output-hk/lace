import { AuthenticationCancelledError } from '@lace-contract/signer';
import { HexBytes } from '@lace-sdk/util';
import { firstValueFrom, of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { CardanoInMemoryTransactionSigner } from '../../src/signing/cardano-in-memory-transaction-signer';

import type { Cardano } from '@cardano-sdk/core';
import type {
  Bip32PublicKeyHex,
  Ed25519PublicKeyHex,
} from '@cardano-sdk/crypto';
import type {
  CardanoKeyAgent,
  CardanoTransactionSignerProps,
  CreateCardanoKeyAgent,
} from '@lace-contract/cardano-context';
import type { SignerAuth } from '@lace-contract/signer';

vi.mock('@cardano-sdk/core', () => {
  const mockTxBody = { toCore: vi.fn() };
  const mockAuxiliaryData = {};
  const mockWitnessSet = {
    setVkeys: vi.fn(),
  };
  const mockTransaction = {
    body: vi.fn().mockReturnValue(mockTxBody),
    auxiliaryData: vi.fn().mockReturnValue(mockAuxiliaryData),
    witnessSet: vi.fn().mockReturnValue(mockWitnessSet),
  };

  const mockSignedTx = {
    toCbor: vi.fn().mockReturnValue('signed-tx-cbor'),
  };

  return {
    Serialization: {
      Transaction: Object.assign(vi.fn().mockReturnValue(mockSignedTx), {
        fromCbor: vi.fn().mockReturnValue(mockTransaction),
      }),
      TxCBOR: vi.fn((cbor: string) => cbor),
      CborSet: {
        fromCore: vi.fn(),
      },
      VkeyWitness: {
        fromCore: vi.fn(),
      },
    },
  };
});

const mockChainId: Cardano.ChainId = {
  networkId: 0,
  networkMagic: 1,
};

const createMockAuth = (authSecret: Uint8Array): SignerAuth => ({
  authenticate: vi.fn().mockReturnValue(of(true)),
  accessAuthSecret: vi
    .fn()
    .mockImplementation(
      <T>(callback: (secret: Uint8Array) => T): T => callback(authSecret),
    ),
});

const mockAuthSecret = new Uint8Array([1, 2, 3]);

const mockProps: CardanoTransactionSignerProps = {
  createKeyAgent: vi.fn(),
  accountIndex: 0,
  chainId: mockChainId,
  extendedAccountPublicKey: 'abcd' as unknown as Bip32PublicKeyHex,
  encryptedRootPrivateKey: 'beef' as HexBytes,
  knownAddresses: [],
  utxo: [],
  auth: createMockAuth(mockAuthSecret),
};

describe('CardanoInMemoryTransactionSigner', () => {
  it('triggers auth, accesses secret, and signs transaction', async () => {
    const signatures = new Map<Ed25519PublicKeyHex, string>([
      ['pubkey1' as Ed25519PublicKeyHex, 'sig1'],
    ]);
    const mockKeyAgent: CardanoKeyAgent = {
      signTransaction: vi.fn().mockResolvedValue(signatures),
      signBlob: vi.fn(),
    };
    const createKeyAgent: CreateCardanoKeyAgent = vi
      .fn()
      .mockResolvedValue(mockKeyAgent);

    const auth = createMockAuth(mockAuthSecret);
    const signer = new CardanoInMemoryTransactionSigner({
      ...mockProps,
      createKeyAgent,
      auth,
    });

    const result = await firstValueFrom(
      signer.sign({ serializedTx: HexBytes('tx-cbor-hex') }),
    );

    expect(auth.authenticate).toHaveBeenCalled();
    expect(auth.accessAuthSecret).toHaveBeenCalled();
    expect(createKeyAgent).toHaveBeenCalledWith(
      expect.objectContaining({ authSecret: mockAuthSecret }),
    );
    expect(mockKeyAgent.signTransaction).toHaveBeenCalled();
    expect(result.serializedTx).toBe('signed-tx-cbor');
    expect(result.signatureCount).toBe(1);
  });

  it('passes constructor props to key agent sign context', async () => {
    const knownAddresses = [
      { address: 'addr1' },
    ] as unknown as CardanoTransactionSignerProps['knownAddresses'];
    const utxo = [[{}, {}]] as unknown as CardanoTransactionSignerProps['utxo'];

    const mockKeyAgent: CardanoKeyAgent = {
      signTransaction: vi.fn().mockResolvedValue(new Map()),
      signBlob: vi.fn(),
    };
    const createKeyAgent: CreateCardanoKeyAgent = vi
      .fn()
      .mockResolvedValue(mockKeyAgent);

    const signer = new CardanoInMemoryTransactionSigner({
      ...mockProps,
      createKeyAgent,
      knownAddresses,
      utxo,
    });

    await firstValueFrom(
      signer.sign({ serializedTx: HexBytes('tx-cbor-hex') }),
    );

    expect(mockKeyAgent.signTransaction).toHaveBeenCalledWith(
      expect.anything(),
      { knownAddresses, utxo },
    );
  });

  it('returns observable that completes after emission', async () => {
    const mockKeyAgent: CardanoKeyAgent = {
      signTransaction: vi.fn().mockResolvedValue(new Map()),
      signBlob: vi.fn(),
    };
    const createKeyAgent: CreateCardanoKeyAgent = vi
      .fn()
      .mockResolvedValue(mockKeyAgent);

    const signer = new CardanoInMemoryTransactionSigner({
      ...mockProps,
      createKeyAgent,
    });

    const emissions: unknown[] = [];
    let didComplete = false;
    await new Promise<void>(resolve => {
      signer.sign({ serializedTx: HexBytes('tx-cbor-hex') }).subscribe({
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
    const auth: SignerAuth = {
      authenticate: vi.fn().mockReturnValue(of(false)),
      accessAuthSecret: vi.fn(),
    };

    const signer = new CardanoInMemoryTransactionSigner({
      ...mockProps,
      auth,
    });

    await expect(
      firstValueFrom(signer.sign({ serializedTx: HexBytes('tx-cbor-hex') })),
    ).rejects.toThrow(AuthenticationCancelledError);
    expect(auth.accessAuthSecret).not.toHaveBeenCalled();
  });
});
