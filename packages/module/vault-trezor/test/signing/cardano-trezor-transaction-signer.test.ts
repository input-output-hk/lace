import { HexBytes } from '@lace-lib/util';
import { firstValueFrom } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CardanoTrezorTransactionSigner } from '../../src/signing/cardano-trezor-transaction-signer';

import type * as CardanoSdkCore from '@cardano-sdk/core';
import type { Cardano } from '@cardano-sdk/core';
import type { Bip32PublicKeyHex } from '@cardano-sdk/crypto';
import type { GroupedAddress } from '@cardano-sdk/key-management';

const hoisted = vi.hoisted(() => {
  const mockTxBody = {
    toCore: vi.fn().mockReturnValue({ inputs: [], outputs: [], fee: 0n }),
  };
  const mockWitnessSet = { setVkeys: vi.fn() };
  const mockTransaction = {
    body: vi.fn().mockReturnValue(mockTxBody),
    auxiliaryData: vi.fn().mockReturnValue({}),
    witnessSet: vi.fn().mockReturnValue(mockWitnessSet),
    toCore: vi.fn().mockReturnValue({ witness: { scripts: [] } }),
  };
  const mockSignedTx = { toCbor: vi.fn().mockReturnValue('signed-tx-cbor') };
  return {
    mockTxBody,
    mockTransaction,
    signTransaction: vi.fn().mockResolvedValue(new Map()),
    initializeTrezorTransport: vi.fn().mockResolvedValue(true),
    dispose: vi.fn(),
    TransactionCtor: Object.assign(vi.fn().mockReturnValue(mockSignedTx), {
      fromCbor: vi.fn().mockReturnValue(mockTransaction),
    }),
  };
});

vi.mock('@cardano-sdk/core', async importOriginal => {
  const actual = await importOriginal<typeof CardanoSdkCore>();
  return {
    ...actual,
    Serialization: {
      Transaction: hoisted.TransactionCtor,
      TxCBOR: vi.fn((cbor: string) => cbor),
      CborSet: { fromCore: vi.fn() },
      VkeyWitness: { fromCore: vi.fn() },
    },
  };
});

// The desktop signer constructs TrezorKeyAgent directly (no DI), so the SDK is
// stubbed at the module level: a constructable mock carrying the signTransaction
// spy plus the static initializeTrezorTransport awaited before construction.
vi.mock('@cardano-sdk/hardware-trezor', () => ({
  TrezorKeyAgent: Object.assign(
    vi.fn().mockImplementation(() => ({
      signTransaction: hoisted.signTransaction,
    })),
    { initializeTrezorTransport: hoisted.initializeTrezorTransport },
  ),
}));

vi.mock('@trezor/connect-web', () => ({
  default: { dispose: hoisted.dispose },
}));

const baseProps = {
  accountIndex: 0,
  chainId: { networkId: 0, networkMagic: 1 } as Cardano.ChainId,
  extendedAccountPublicKey: 'abcd' as unknown as Bip32PublicKeyHex,
  knownAddresses: [] as GroupedAddress[],
  utxo: [] as Cardano.Utxo[],
};

describe('CardanoTrezorTransactionSigner', () => {
  beforeEach(() => {
    hoisted.signTransaction.mockClear().mockResolvedValue(new Map());
    hoisted.initializeTrezorTransport.mockClear().mockResolvedValue(true);
    hoisted.dispose.mockClear();
    hoisted.mockTransaction.toCore.mockReturnValue({
      witness: { scripts: [] },
    });
    hoisted.mockTxBody.toCore.mockReturnValue({
      inputs: [],
      outputs: [],
      fee: 0n,
    });
  });

  it('initializes the Trezor transport, signs, and returns assembled CBOR with signature count', async () => {
    hoisted.signTransaction.mockResolvedValue(new Map([['pubkey1', 'sig1']]));

    const signer = new CardanoTrezorTransactionSigner(baseProps);
    const result = await firstValueFrom(
      signer.sign({ serializedTx: HexBytes('tx-cbor-hex') }),
    );

    expect(hoisted.initializeTrezorTransport).toHaveBeenCalled();
    expect(result.serializedTx).toBe('signed-tx-cbor');
    expect(result.signatureCount).toBe(1);
  });

  it('passes the native scripts carried by the tx to the key agent', async () => {
    const scripts = [
      { kind: 0, keyHash: 'own-key-hash' },
    ] as unknown as Cardano.Script[];
    hoisted.mockTransaction.toCore.mockReturnValue({ witness: { scripts } });

    const signer = new CardanoTrezorTransactionSigner(baseProps);
    await firstValueFrom(
      signer.sign({ serializedTx: HexBytes('tx-cbor-hex') }),
    );

    expect(hoisted.signTransaction).toHaveBeenCalledWith(expect.anything(), {
      knownAddresses: baseProps.knownAddresses,
      txInKeyPathMap: {},
      scripts,
    });
  });

  it('disposes the Trezor connection after signing', async () => {
    const signer = new CardanoTrezorTransactionSigner(baseProps);
    await firstValueFrom(
      signer.sign({ serializedTx: HexBytes('tx-cbor-hex') }),
    );

    expect(hoisted.dispose).toHaveBeenCalledTimes(1);
  });

  it('disposes the Trezor connection even when signing fails', async () => {
    hoisted.signTransaction.mockRejectedValue(new Error('device rejected'));

    const signer = new CardanoTrezorTransactionSigner(baseProps);

    await expect(
      firstValueFrom(signer.sign({ serializedTx: HexBytes('tx-cbor-hex') })),
    ).rejects.toThrow('device rejected');
    expect(hoisted.dispose).toHaveBeenCalledTimes(1);
  });

  it('forwards derivationType into the Trezor transport config', async () => {
    const signer = new CardanoTrezorTransactionSigner({
      ...baseProps,
      derivationType: 'ICARUS_TREZOR',
    });
    await firstValueFrom(
      signer.sign({ serializedTx: HexBytes('tx-cbor-hex') }),
    );

    expect(hoisted.initializeTrezorTransport).toHaveBeenCalledWith(
      expect.objectContaining({ derivationType: 'ICARUS_TREZOR' }),
    );
  });
});
