import {
  AirGappedQrExchangeCancelledError,
  airGappedQrExchangeHook,
} from '@lace-contract/air-gapped-qr-exchange';
import { CardanoUrType } from '@lace-lib/cardano-seed-signer-protocol';
import { HexBytes } from '@lace-lib/util';
import { firstValueFrom, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CardanoSeedSignerTransactionSigner } from '../../../src/cardano/signing/cardano-seed-signer-transaction-signer';

import type { GroupedAddress } from '@cardano-sdk/key-management';
import type * as ProtocolModule from '@lace-lib/cardano-seed-signer-protocol';
import type { BuildTxSignRequestParams } from '@lace-lib/cardano-seed-signer-protocol';

const txBody = {
  inputs: [
    { txId: 'ab'.repeat(32), index: 0 },
    { txId: 'cd'.repeat(32), index: 1 },
  ],
  outputs: [{ address: 'addr_change' }, { address: 'addr_foreign' }],
};

const mockWitnessSet = { setVkeys: vi.fn() };
const toCore = vi.fn().mockReturnValue(txBody);
const mockTx = {
  body: vi.fn().mockReturnValue({
    toCore,
    toCbor: vi.fn().mockReturnValue('body-cbor'),
  }),
  witnessSet: vi.fn().mockReturnValue(mockWitnessSet),
  auxiliaryData: vi.fn().mockReturnValue({}),
};

vi.mock('@cardano-sdk/core', () => ({
  Serialization: {
    Transaction: Object.assign(
      vi.fn().mockReturnValue({ toCbor: () => 'signed-tx-cbor' }),
      { fromCbor: vi.fn(() => mockTx) },
    ),
    TxCBOR: vi.fn((cbor: string) => cbor),
    CborSet: { fromCore: vi.fn(() => 'vkey-set') },
    VkeyWitness: { fromCore: vi.fn() },
  },
}));

const DREP_KEY_HASH = 'drep-key-hash';

const createTxInKeyPathMap = vi.hoisted(() =>
  vi.fn<() => Promise<Record<string, unknown>>>(),
);
const ownSignatureKeyPaths = vi.hoisted(() =>
  vi.fn<
    (
      ...args: [unknown, unknown, unknown, string?]
    ) => { role: number; index: number }[]
  >(),
);
vi.mock('@cardano-sdk/key-management', () => ({
  TxInId: ({ txId, index }: { txId: string; index: number }) =>
    `${txId}#${index}`,
  util: { createTxInKeyPathMap, ownSignatureKeyPaths },
}));

vi.mock('@lace-contract/cardano-context', () => ({
  createInputResolver: vi.fn(() => ({})),
  deriveDRepKeyHash: vi.fn(async () => DREP_KEY_HASH),
}));

const buildRequest = vi.hoisted(() =>
  vi.fn<(params: BuildTxSignRequestParams) => void>(),
);
const parseResponse = vi.hoisted(() => vi.fn());
vi.mock('@lace-lib/cardano-seed-signer-protocol', async importOriginal => {
  const actual = await importOriginal<typeof ProtocolModule>();
  return {
    ...actual,
    buildTxSignRequest: (params: BuildTxSignRequestParams) => {
      buildRequest(params);
      return {
        urType: actual.CardanoUrType.TxSignRequest,
        cbor: new Uint8Array([1]),
      };
    },
    parseTxSignResponse: (cbor: Uint8Array) => parseResponse(cbor) as unknown,
  };
});

const knownAddresses = [
  { address: 'addr_change', type: 0, index: 5 },
] as unknown as GroupedAddress[];

const triggerSpy = vi.spyOn(airGappedQrExchangeHook, 'trigger');

const buildSigner = (
  overrides: { masterFingerprint?: string } = { masterFingerprint: 'deadbeef' },
): CardanoSeedSignerTransactionSigner =>
  new CardanoSeedSignerTransactionSigner({
    accountIndex: 0,
    chainId: { networkId: 0, networkMagic: 1 } as never,
    extendedAccountPublicKey: '0'.repeat(128) as never,
    masterFingerprint: overrides.masterFingerprint as never,
    knownAddresses,
    utxo: [],
  });

const witness = {
  vkey: 'aa'.repeat(32),
  signature: 'bb'.repeat(64),
};

describe('CardanoSeedSignerTransactionSigner', () => {
  beforeEach(() => {
    triggerSpy.mockReset();
    buildRequest.mockClear();
    parseResponse.mockReset();
    mockWitnessSet.setVkeys.mockClear();
    toCore.mockReturnValue(txBody);
    createTxInKeyPathMap.mockResolvedValue({
      [`${'ab'.repeat(32)}#0`]: { role: 0, index: 5 },
    });
    ownSignatureKeyPaths.mockReturnValue([{ role: 0, index: 5 }]);
    triggerSpy.mockReturnValue(
      of({ urType: CardanoUrType.TxSignResponse, cbor: new Uint8Array([9]) }),
    );
    parseResponse.mockImplementation(() => ({
      requestId: buildRequest.mock.calls[0][0].requestId,
      witnesses: [witness],
    }));
  });

  it('signs and returns the serialized tx with the witness count', async () => {
    const result = await firstValueFrom(
      buildSigner().sign({ serializedTx: HexBytes('tx-cbor') }),
    );

    expect(result.serializedTx).toBe('signed-tx-cbor');
    expect(result.signatureCount).toBe(1);
    expect(mockWitnessSet.setVkeys).toHaveBeenCalledTimes(1);
    expect(triggerSpy.mock.calls[0][0].expectedResponseType).toBe(
      CardanoUrType.TxSignResponse,
    );
  });

  it('maps only owned inputs to signing inputs', async () => {
    await firstValueFrom(buildSigner().sign({ serializedTx: HexBytes('tx') }));

    const params = buildRequest.mock.calls[0][0];
    expect(params.signingInputs).toHaveLength(1);
    expect(params.signingInputs[0].index).toBe(0);
    expect(params.signingInputs[0].path.slice(3)).toEqual([0, 5]);
  });

  it('signs an owned collateral input when the spend inputs are script-locked', async () => {
    const collateralTxId = 'ef'.repeat(32);
    toCore.mockReturnValue({
      inputs: [{ txId: 'ab'.repeat(32), index: 0 }],
      collaterals: [{ txId: collateralTxId, index: 2 }],
      outputs: [],
    });
    createTxInKeyPathMap.mockResolvedValue({
      [`${collateralTxId}#2`]: { role: 0, index: 7 },
    });
    ownSignatureKeyPaths.mockReturnValue([{ role: 0, index: 7 }]);

    await firstValueFrom(buildSigner().sign({ serializedTx: HexBytes('tx') }));

    const params = buildRequest.mock.calls[0][0];
    expect(params.signingInputs).toHaveLength(1);
    expect(params.signingInputs[0].index).toBe(2);
    expect(params.signingInputs[0].path.slice(3)).toEqual([0, 7]);
    expect(params.extraSigners).toHaveLength(0);
  });

  it('declares the collateral return path when the output pays to a known address', async () => {
    toCore.mockReturnValue({
      ...txBody,
      collateralReturn: { address: 'addr_change' },
    });

    await firstValueFrom(buildSigner().sign({ serializedTx: HexBytes('tx') }));

    const params = buildRequest.mock.calls[0][0];
    expect(params.collateralReturnPath).toBeDefined();
    expect(params.collateralReturnPath?.path.slice(3)).toEqual([0, 5]);
    expect(params.collateralReturnPath?.xfp).toHaveLength(4);
  });

  it('omits the collateral return path when the output address is foreign', async () => {
    toCore.mockReturnValue({
      ...txBody,
      collateralReturn: { address: 'addr_foreign' },
    });

    await firstValueFrom(buildSigner().sign({ serializedTx: HexBytes('tx') }));

    expect(buildRequest.mock.calls[0][0].collateralReturnPath).toBeUndefined();
  });

  it('omits the collateral return path when the body has no collateral return', async () => {
    await firstValueFrom(buildSigner().sign({ serializedTx: HexBytes('tx') }));

    expect(buildRequest.mock.calls[0][0].collateralReturnPath).toBeUndefined();
  });

  it('omits the collateral return path when no master fingerprint is known', async () => {
    toCore.mockReturnValue({
      ...txBody,
      collateralReturn: { address: 'addr_change' },
    });

    await firstValueFrom(
      buildSigner({ masterFingerprint: undefined }).sign({
        serializedTx: HexBytes('tx'),
      }),
    );

    expect(buildRequest.mock.calls[0][0].collateralReturnPath).toBeUndefined();
  });

  it('maps outputs to known addresses as change outputs', async () => {
    await firstValueFrom(buildSigner().sign({ serializedTx: HexBytes('tx') }));

    const params = buildRequest.mock.calls[0][0];
    expect(params.changeOutputs).toHaveLength(1);
    expect(params.changeOutputs[0].index).toBe(0);
    expect(params.changeOutputs[0].path.slice(3)).toEqual([0, 5]);
  });

  it('adds no extra signers when only payment inputs need signing', async () => {
    await firstValueFrom(buildSigner().sign({ serializedTx: HexBytes('tx') }));

    expect(buildRequest.mock.calls[0][0].extraSigners).toHaveLength(0);
  });

  it('adds the stake key as an extra signer for a stake certificate', async () => {
    ownSignatureKeyPaths.mockReturnValue([
      { role: 0, index: 5 },
      { role: 2, index: 0 },
    ]);

    await firstValueFrom(buildSigner().sign({ serializedTx: HexBytes('tx') }));

    const { extraSigners } = buildRequest.mock.calls[0][0];
    expect(extraSigners).toHaveLength(1);
    expect(extraSigners[0].path.slice(3)).toEqual([2, 0]);
  });

  it('resolves owned key paths with the derived DRep key hash', async () => {
    await firstValueFrom(buildSigner().sign({ serializedTx: HexBytes('tx') }));

    expect(ownSignatureKeyPaths.mock.calls[0][3]).toBe(DREP_KEY_HASH);
  });

  it('adds the DRep key as an extra signer for a DRep certificate', async () => {
    ownSignatureKeyPaths.mockReturnValue([
      { role: 0, index: 5 },
      { role: 3, index: 0 },
    ]);

    await firstValueFrom(buildSigner().sign({ serializedTx: HexBytes('tx') }));

    const { extraSigners } = buildRequest.mock.calls[0][0];
    expect(extraSigners).toHaveLength(1);
    expect(extraSigners[0].path.slice(3)).toEqual([3, 0]);
  });

  it('does not duplicate a payment-input path as an extra signer', async () => {
    ownSignatureKeyPaths.mockReturnValue([
      { role: 0, index: 5 },
      { role: 2, index: 0 },
    ]);

    await firstValueFrom(buildSigner().sign({ serializedTx: HexBytes('tx') }));

    const { extraSigners } = buildRequest.mock.calls[0][0];
    expect(extraSigners).toHaveLength(1);
    expect(extraSigners[0].path.slice(3)).toEqual([2, 0]);
    expect(extraSigners.some(signer => signer.path.slice(3)[0] === 0)).toBe(
      false,
    );
  });

  it('throws when the device returns an empty witness set', async () => {
    parseResponse.mockImplementation(() => ({
      requestId: buildRequest.mock.calls[0][0].requestId,
      witnesses: [],
    }));

    await expect(
      firstValueFrom(buildSigner().sign({ serializedTx: HexBytes('tx') })),
    ).rejects.toThrow(/no transaction witnesses/);
  });

  it('rejects a response whose request id does not match the request', async () => {
    parseResponse.mockReturnValue({
      requestId: 'stale-request-id',
      witnesses: [witness],
    });

    await expect(
      firstValueFrom(buildSigner().sign({ serializedTx: HexBytes('tx') })),
    ).rejects.toThrow(/stale or mismatched response/);
  });

  it('surfaces a malformed response parse error', async () => {
    parseResponse.mockImplementation(() => {
      throw new Error('cardano-tx-sig-res missing vkey_witness_set');
    });

    await expect(
      firstValueFrom(buildSigner().sign({ serializedTx: HexBytes('tx') })),
    ).rejects.toThrow(/missing vkey_witness_set/);
  });

  it('propagates the cancelled error', async () => {
    triggerSpy.mockReturnValue(
      throwError(() => new AirGappedQrExchangeCancelledError()),
    );

    await expect(
      firstValueFrom(buildSigner().sign({ serializedTx: HexBytes('tx') })),
    ).rejects.toBeInstanceOf(AirGappedQrExchangeCancelledError);
  });
});
