import { Serialization } from '@cardano-sdk/core';
import { AuthenticationCancelledError } from '@lace-contract/signer';
import { HexBytes } from '@lace-lib/util';
import { firstValueFrom, of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { CardanoInMemoryTransactionSigner } from '../../src/signing/cardano-in-memory-transaction-signer';

import type { WithCardanoKeyAgent$ } from '../../src/signing/cardano-in-memory-transaction-signer';
import type { CardanoKeyAgent } from '../../src/signing/types';
import type { Ed25519PublicKeyHex } from '@cardano-sdk/crypto';
import type { SignerAuth } from '@lace-contract/signer';
import type { Observable } from 'rxjs';

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
    toCore: vi.fn().mockReturnValue({ witness: { scripts: [] } }),
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

const createMockAuth = (): SignerAuth => ({
  authenticate: vi.fn().mockReturnValue(of(true)),
  accessAuthSecret: vi.fn(),
});

describe('CardanoInMemoryTransactionSigner', () => {
  it('triggers auth, resolves the key agent, and signs the transaction', async () => {
    const signatures = new Map<Ed25519PublicKeyHex, string>([
      ['pubkey1' as Ed25519PublicKeyHex, 'sig1'],
    ]);
    const keyAgent: CardanoKeyAgent = {
      signTransaction: vi.fn().mockResolvedValue(signatures),
      signBlob: vi.fn(),
    };
    const withKeyAgent$ = vi.fn(
      (use: (keyAgent: CardanoKeyAgent) => Observable<unknown>) =>
        use(keyAgent),
    ) as unknown as WithCardanoKeyAgent$;

    const auth = createMockAuth();
    const signer = new CardanoInMemoryTransactionSigner({
      withKeyAgent$,
      knownAddresses: [],
      utxo: [],
      auth,
    });

    const result = await firstValueFrom(
      signer.sign({ serializedTx: HexBytes('tx-cbor-hex') }),
    );

    expect(auth.authenticate).toHaveBeenCalled();
    expect(withKeyAgent$).toHaveBeenCalledTimes(1);
    expect(keyAgent.signTransaction).toHaveBeenCalled();
    expect(result.serializedTx).toBe('signed-tx-cbor');
    expect(result.signatureCount).toBe(1);
  });

  it('passes knownAddresses, utxo, and native scripts from the tx to the key agent', async () => {
    const knownAddresses = [{ address: 'addr1' }] as unknown as Parameters<
      CardanoKeyAgent['signTransaction']
    >[1]['knownAddresses'];
    const utxo = [[{}, {}]] as unknown as Parameters<
      CardanoKeyAgent['signTransaction']
    >[1]['utxo'];
    const scripts = [{ kind: 0, keyHash: 'key-hash' }] as unknown as Parameters<
      CardanoKeyAgent['signTransaction']
    >[1]['scripts'];

    const tx = Serialization.Transaction.fromCbor('tx-cbor-hex' as never);
    vi.mocked(tx.toCore).mockReturnValue({ witness: { scripts } } as never);

    const keyAgent: CardanoKeyAgent = {
      signTransaction: vi.fn().mockResolvedValue(new Map()),
      signBlob: vi.fn(),
    };

    const withKeyAgent$ = vi.fn(
      (use: (keyAgent: CardanoKeyAgent) => Observable<unknown>) =>
        use(keyAgent),
    ) as unknown as WithCardanoKeyAgent$;
    const signer = new CardanoInMemoryTransactionSigner({
      withKeyAgent$,
      knownAddresses,
      utxo,
      auth: createMockAuth(),
    });

    await firstValueFrom(
      signer.sign({ serializedTx: HexBytes('tx-cbor-hex') }),
    );

    expect(keyAgent.signTransaction).toHaveBeenCalledWith(expect.anything(), {
      knownAddresses,
      utxo,
      scripts,
    });
  });

  it('signs without crashing when the tx carries no scripts', async () => {
    const tx = Serialization.Transaction.fromCbor('tx-cbor-hex' as never);
    vi.mocked(tx.toCore).mockReturnValue({ witness: {} } as never);

    const keyAgent: CardanoKeyAgent = {
      signTransaction: vi.fn().mockResolvedValue(new Map()),
      signBlob: vi.fn(),
    };

    const withKeyAgent$ = vi.fn(
      (use: (keyAgent: CardanoKeyAgent) => Observable<unknown>) =>
        use(keyAgent),
    ) as unknown as WithCardanoKeyAgent$;
    const signer = new CardanoInMemoryTransactionSigner({
      withKeyAgent$,
      knownAddresses: [],
      utxo: [],
      auth: createMockAuth(),
    });

    await firstValueFrom(
      signer.sign({ serializedTx: HexBytes('tx-cbor-hex') }),
    );

    expect(keyAgent.signTransaction).toHaveBeenCalledWith(expect.anything(), {
      knownAddresses: [],
      utxo: [],
      scripts: undefined,
    });
  });

  it('returns an observable that completes after one emission', async () => {
    const keyAgent: CardanoKeyAgent = {
      signTransaction: vi.fn().mockResolvedValue(new Map()),
      signBlob: vi.fn(),
    };

    const withKeyAgent$ = vi.fn(
      (use: (keyAgent: CardanoKeyAgent) => Observable<unknown>) =>
        use(keyAgent),
    ) as unknown as WithCardanoKeyAgent$;
    const signer = new CardanoInMemoryTransactionSigner({
      withKeyAgent$,
      knownAddresses: [],
      utxo: [],
      auth: createMockAuth(),
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

  it('throws AuthenticationCancelledError when the user cancels auth', async () => {
    const auth: SignerAuth = {
      authenticate: vi.fn().mockReturnValue(of(false)),
      accessAuthSecret: vi.fn(),
    };
    const withKeyAgent$: WithCardanoKeyAgent$ = vi.fn();

    const signer = new CardanoInMemoryTransactionSigner({
      withKeyAgent$,
      knownAddresses: [],
      utxo: [],
      auth,
    });

    await expect(
      firstValueFrom(signer.sign({ serializedTx: HexBytes('tx-cbor-hex') })),
    ).rejects.toThrow(AuthenticationCancelledError);
    expect(withKeyAgent$).not.toHaveBeenCalled();
  });
});
