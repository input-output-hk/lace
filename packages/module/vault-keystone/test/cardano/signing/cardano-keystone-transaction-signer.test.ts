import { Buffer } from 'buffer';

import {
  AirGappedQrExchangeCancelledError,
  airGappedQrExchangeHook,
} from '@lace-contract/air-gapped-qr-exchange';
import {
  ADA_TX_SIZE_LIMIT,
  KeystoneUrType,
} from '@lace-lib/cardano-keystone-protocol';
import { HexBytes } from '@lace-lib/util';
import { firstValueFrom, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CardanoKeystoneTransactionSigner } from '../../../src/cardano/signing/cardano-keystone-transaction-signer';

import type { CardanoKeystoneTransactionSignerProps } from '../../../src/cardano/signing/cardano-keystone-transaction-signer';
import type { GroupedAddress } from '@cardano-sdk/key-management';
import type * as ProtocolModule from '@lace-lib/cardano-keystone-protocol';
import type {
  BuildTxHashSignRequestParams,
  BuildTxSignRequestParams,
} from '@lace-lib/cardano-keystone-protocol';

const OWN_TX_ID = 'ab'.repeat(32);
const FOREIGN_TX_ID = 'cd'.repeat(32);
const STAKE_KEY_HASH = 'e5'.repeat(28);
const PAYMENT_KEY_HASH = 'bb'.repeat(28);
const DREP_KEY_HASH = 'a3'.repeat(28);
const TX_ID = 'f0'.repeat(32);

const txBody = {
  inputs: [
    { txId: OWN_TX_ID, index: 0 },
    { txId: FOREIGN_TX_ID, index: 1 },
  ],
  outputs: [{ address: 'addr_change' }, { address: 'addr_foreign' }],
};

interface WitnessMock {
  vkey: () => string;
  signature: () => string;
  toCore: () => [string, string];
}

const witnessMock = (vkey: string, signature: string): WitnessMock => ({
  vkey: () => vkey,
  signature: () => signature,
  toCore: () => [vkey, signature],
});

const deviceState = vi.hoisted(() => ({
  witnesses: [] as unknown[],
}));
const existingState = vi.hoisted(() => ({
  witnesses: undefined as unknown[] | undefined,
}));

const mockWitnessSet = {
  vkeys: vi.fn(() =>
    existingState.witnesses === undefined
      ? undefined
      : { values: () => existingState.witnesses },
  ),
  setVkeys: vi.fn(),
};
const toCore = vi.fn().mockReturnValue(txBody);
const mockTx = {
  body: vi.fn().mockReturnValue({ toCore }),
  witnessSet: vi.fn().mockReturnValue(mockWitnessSet),
  auxiliaryData: vi.fn().mockReturnValue({}),
  getId: vi.fn(() => TX_ID),
};

const cborSetFromCore = vi.hoisted(() =>
  vi.fn((..._args: [unknown[], unknown]) => 'vkey-set'),
);

vi.mock('@cardano-sdk/core', () => ({
  Cardano: {
    RewardAccount: { toHash: vi.fn(() => STAKE_KEY_HASH) },
    Address: {
      fromString: vi.fn(() => ({
        getProps: () => ({ paymentPart: { hash: PAYMENT_KEY_HASH } }),
      })),
    },
  },
  Serialization: {
    Transaction: Object.assign(
      vi.fn().mockReturnValue({ toCbor: () => 'signed-tx-cbor' }),
      { fromCbor: vi.fn(() => mockTx) },
    ),
    TxCBOR: vi.fn((cbor: string) => cbor),
    TransactionWitnessSet: {
      fromCbor: vi.fn(() => ({
        vkeys: () =>
          deviceState.witnesses.length === 0
            ? undefined
            : { values: () => deviceState.witnesses },
      })),
    },
    CborSet: { fromCore: cborSetFromCore },
    VkeyWitness: { fromCore: vi.fn() },
  },
}));

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
const buildHashRequest = vi.hoisted(() =>
  vi.fn<(params: BuildTxHashSignRequestParams) => void>(),
);
const parseResponse = vi.hoisted(() => vi.fn());
const parseHashResponse = vi.hoisted(() => vi.fn());
vi.mock('@lace-lib/cardano-keystone-protocol', async importOriginal => {
  const actual = await importOriginal<typeof ProtocolModule>();
  return {
    ...actual,
    buildTxSignRequest: (params: BuildTxSignRequestParams) => {
      buildRequest(params);
      return {
        urType: actual.KeystoneUrType.TxSignRequest,
        cbor: new Uint8Array([1]),
      };
    },
    buildTxHashSignRequest: (params: BuildTxHashSignRequestParams) => {
      buildHashRequest(params);
      return {
        urType: actual.KeystoneUrType.TxHashSignRequest,
        cbor: new Uint8Array([2]),
      };
    },
    parseTxSignResponse: (result: unknown) => parseResponse(result) as unknown,
    parseTxHashSignResponse: (result: unknown) =>
      parseHashResponse(result) as unknown,
  };
});

const knownAddresses = [
  {
    address: 'addr_change',
    type: 0,
    index: 5,
    rewardAccount: 'stake_test1xyz',
    stakeKeyDerivationPath: { role: 2, index: 0 },
  },
] as unknown as GroupedAddress[];

const ownUtxo = [
  [
    { txId: OWN_TX_ID, index: 0 },
    { address: 'addr_own', value: { coins: 10_000_000n } },
  ],
] as never;

const triggerSpy = vi.spyOn(airGappedQrExchangeHook, 'trigger');

const buildSigner = (
  overrides: Partial<CardanoKeystoneTransactionSignerProps> = {},
): CardanoKeystoneTransactionSigner =>
  new CardanoKeystoneTransactionSigner({
    accountIndex: 0,
    chainId: { networkId: 0, networkMagic: 1 } as never,
    extendedAccountPublicKey: '0'.repeat(128) as never,
    masterFingerprint: 'deadbeef' as never,
    knownAddresses,
    utxo: ownUtxo,
    ...overrides,
  });

describe('CardanoKeystoneTransactionSigner', () => {
  beforeEach(() => {
    triggerSpy.mockReset();
    buildRequest.mockClear();
    buildHashRequest.mockClear();
    parseResponse.mockReset();
    parseHashResponse.mockReset();
    cborSetFromCore.mockClear();
    mockWitnessSet.setVkeys.mockClear();
    toCore.mockReturnValue(txBody);
    deviceState.witnesses = [witnessMock('aa'.repeat(32), 'bb'.repeat(64))];
    existingState.witnesses = undefined;
    createTxInKeyPathMap.mockResolvedValue({
      [`${OWN_TX_ID}#0`]: { role: 0, index: 5 },
    });
    ownSignatureKeyPaths.mockReturnValue([{ role: 0, index: 5 }]);
    triggerSpy.mockReturnValue(
      of({
        urType: KeystoneUrType.TxSignResponse,
        cbor: new Uint8Array([9]),
      }),
    );
    parseResponse.mockImplementation(() => ({
      requestId: buildRequest.mock.calls[0][0].requestId,
      witnessSet: new Uint8Array([7]),
    }));
    parseHashResponse.mockImplementation(() => ({
      witnessSet: new Uint8Array([8]),
    }));
  });

  it('signs and returns the serialized tx with the device witness count', async () => {
    const result = await firstValueFrom(
      buildSigner().sign({ serializedTx: HexBytes('abcd') }),
    );

    expect(result.serializedTx).toBe('signed-tx-cbor');
    expect(result.signatureCount).toBe(1);
    expect(mockWitnessSet.setVkeys).toHaveBeenCalledTimes(1);
    expect(triggerSpy.mock.calls[0][0].expectedResponseType).toBe(
      KeystoneUrType.TxSignResponse,
    );
  });

  it('sends the full unsigned tx CBOR as signData', async () => {
    await firstValueFrom(
      buildSigner().sign({ serializedTx: HexBytes('abcd') }),
    );

    const params = buildRequest.mock.calls[0][0];
    expect(Buffer.from(params.signData).toString('hex')).toBe('abcd');
  });

  it('preserves existing witnesses and merges the device witness set over them', async () => {
    existingState.witnesses = [
      witnessMock('aa'.repeat(32), '00'.repeat(64)),
      witnessMock('cc'.repeat(32), '11'.repeat(64)),
    ];
    deviceState.witnesses = [witnessMock('aa'.repeat(32), 'bb'.repeat(64))];

    const result = await firstValueFrom(
      buildSigner().sign({ serializedTx: HexBytes('abcd') }),
    );

    expect(cborSetFromCore.mock.calls[0][0]).toEqual([
      ['aa'.repeat(32), 'bb'.repeat(64)],
      ['cc'.repeat(32), '11'.repeat(64)],
    ]);
    expect(result.signatureCount).toBe(1);
  });

  it('maps only owned inputs to utxo entries with amount and address', async () => {
    await firstValueFrom(
      buildSigner().sign({ serializedTx: HexBytes('abcd') }),
    );

    const params = buildRequest.mock.calls[0][0];
    expect(params.utxos).toHaveLength(1);
    expect(params.utxos[0].index).toBe(0);
    expect(params.utxos[0].amount).toBe(10_000_000n);
    expect(params.utxos[0].address).toBe('addr_own');
    expect(Buffer.from(params.utxos[0].transactionHash).toString('hex')).toBe(
      OWN_TX_ID,
    );
    expect(params.utxos[0].path.slice(3)).toEqual([0, 5]);
  });

  it('routes an owned collateral input through extraSigners, not utxos', async () => {
    const collateralTxId = 'ef'.repeat(32);
    toCore.mockReturnValue({
      inputs: [{ txId: OWN_TX_ID, index: 0 }],
      collaterals: [{ txId: collateralTxId, index: 2 }],
      outputs: [],
    });
    createTxInKeyPathMap.mockResolvedValue({
      [`${collateralTxId}#2`]: { role: 0, index: 7 },
    });
    ownSignatureKeyPaths.mockReturnValue([{ role: 0, index: 7 }]);
    const withCollateralAddress = [
      ...knownAddresses,
      { address: 'addr_collateral', type: 0, index: 7 },
    ] as unknown as GroupedAddress[];

    await firstValueFrom(
      buildSigner({ knownAddresses: withCollateralAddress }).sign({
        serializedTx: HexBytes('abcd'),
      }),
    );

    const params = buildRequest.mock.calls[0][0];
    expect(params.utxos).toHaveLength(0);
    expect(params.extraSigners).toHaveLength(1);
    expect(params.extraSigners[0].path.slice(3)).toEqual([0, 7]);
    expect(Buffer.from(params.extraSigners[0].keyHash).toString('hex')).toBe(
      PAYMENT_KEY_HASH,
    );
  });

  it('requests a witness once for an input listed as both spend and collateral', async () => {
    toCore.mockReturnValue({
      inputs: [{ txId: OWN_TX_ID, index: 0 }],
      collaterals: [{ txId: OWN_TX_ID, index: 0 }],
      outputs: [],
    });

    await firstValueFrom(
      buildSigner().sign({ serializedTx: HexBytes('abcd') }),
    );

    const params = buildRequest.mock.calls[0][0];
    expect(params.utxos).toHaveLength(1);
    expect(params.extraSigners).toHaveLength(0);
  });

  it('throws when an owned input is missing from the wallet utxo set', async () => {
    await expect(
      firstValueFrom(
        buildSigner({ utxo: [] }).sign({ serializedTx: HexBytes('abcd') }),
      ),
    ).rejects.toThrow(/missing from the wallet utxo set/);
  });

  it('adds no extra signers when only payment inputs need signing', async () => {
    await firstValueFrom(
      buildSigner().sign({ serializedTx: HexBytes('abcd') }),
    );

    expect(buildRequest.mock.calls[0][0].extraSigners).toHaveLength(0);
  });

  it('adds the stake key hash as an extra signer for a stake certificate', async () => {
    ownSignatureKeyPaths.mockReturnValue([
      { role: 0, index: 5 },
      { role: 2, index: 0 },
    ]);
    const withScriptAddress = [
      { address: 'addr_script', type: 0, index: 9 },
      ...knownAddresses,
    ] as unknown as GroupedAddress[];

    await firstValueFrom(
      buildSigner({ knownAddresses: withScriptAddress }).sign({
        serializedTx: HexBytes('abcd'),
      }),
    );

    const { extraSigners } = buildRequest.mock.calls[0][0];
    expect(extraSigners).toHaveLength(1);
    expect(extraSigners[0].path.slice(3)).toEqual([2, 0]);
    expect(Buffer.from(extraSigners[0].keyHash).toString('hex')).toBe(
      STAKE_KEY_HASH,
    );
  });

  it('falls back to stake index 0 for an address without an explicit stake path', async () => {
    ownSignatureKeyPaths.mockReturnValue([{ role: 2, index: 0 }]);
    const implicitStakeAddresses = [
      {
        address: 'addr_change',
        type: 0,
        index: 5,
        rewardAccount: 'stake_test1xyz',
      },
    ] as unknown as GroupedAddress[];

    await firstValueFrom(
      buildSigner({ knownAddresses: implicitStakeAddresses }).sign({
        serializedTx: HexBytes('abcd'),
      }),
    );

    const { extraSigners } = buildRequest.mock.calls[0][0];
    expect(extraSigners).toHaveLength(1);
    expect(Buffer.from(extraSigners[0].keyHash).toString('hex')).toBe(
      STAKE_KEY_HASH,
    );
  });

  it('throws when the stake key hash cannot be resolved', async () => {
    ownSignatureKeyPaths.mockReturnValue([{ role: 2, index: 9 }]);

    await expect(
      firstValueFrom(buildSigner().sign({ serializedTx: HexBytes('abcd') })),
    ).rejects.toThrow(/cannot resolve the stake key hash/);
  });

  it('resolves owned key paths with the derived DRep key hash', async () => {
    await firstValueFrom(
      buildSigner().sign({ serializedTx: HexBytes('abcd') }),
    );

    expect(ownSignatureKeyPaths.mock.calls[0][3]).toBe(DREP_KEY_HASH);
  });

  it('adds the DRep key hash as an extra signer for a DRep certificate', async () => {
    ownSignatureKeyPaths.mockReturnValue([
      { role: 0, index: 5 },
      { role: 3, index: 0 },
    ]);

    await firstValueFrom(
      buildSigner().sign({ serializedTx: HexBytes('abcd') }),
    );

    const { extraSigners } = buildRequest.mock.calls[0][0];
    expect(extraSigners).toHaveLength(1);
    expect(extraSigners[0].path.slice(3)).toEqual([3, 0]);
    expect(Buffer.from(extraSigners[0].keyHash).toString('hex')).toBe(
      DREP_KEY_HASH,
    );
  });

  it('adds a payment key hash for a required signer not covered by inputs', async () => {
    ownSignatureKeyPaths.mockReturnValue([
      { role: 0, index: 5 },
      { role: 1, index: 5 },
    ]);
    const internalAddresses = [
      ...knownAddresses,
      { address: 'addr_internal', type: 1, index: 5 },
    ] as unknown as GroupedAddress[];

    await firstValueFrom(
      buildSigner({ knownAddresses: internalAddresses }).sign({
        serializedTx: HexBytes('abcd'),
      }),
    );

    const { extraSigners } = buildRequest.mock.calls[0][0];
    expect(extraSigners).toHaveLength(1);
    expect(extraSigners[0].path.slice(3)).toEqual([1, 5]);
    expect(Buffer.from(extraSigners[0].keyHash).toString('hex')).toBe(
      PAYMENT_KEY_HASH,
    );
  });

  it('throws when a payment key hash cannot be resolved', async () => {
    ownSignatureKeyPaths.mockReturnValue([{ role: 1, index: 9 }]);

    await expect(
      firstValueFrom(buildSigner().sign({ serializedTx: HexBytes('abcd') })),
    ).rejects.toThrow(/cannot resolve the payment key hash/);
  });

  it('does not duplicate a payment-input path as an extra signer', async () => {
    ownSignatureKeyPaths.mockReturnValue([
      { role: 0, index: 5 },
      { role: 2, index: 0 },
    ]);

    await firstValueFrom(
      buildSigner().sign({ serializedTx: HexBytes('abcd') }),
    );

    const { extraSigners } = buildRequest.mock.calls[0][0];
    expect(extraSigners).toHaveLength(1);
    expect(extraSigners[0].path.slice(3)).toEqual([2, 0]);
    expect(extraSigners.some(signer => signer.path.slice(3)[0] === 0)).toBe(
      false,
    );
  });

  it('throws when the device returns an empty witness set', async () => {
    deviceState.witnesses = [];

    await expect(
      firstValueFrom(buildSigner().sign({ serializedTx: HexBytes('abcd') })),
    ).rejects.toThrow(/no transaction witnesses/);
  });

  it('rejects a response whose request id does not match the request', async () => {
    parseResponse.mockReturnValue({
      requestId: 'stale-request-id',
      witnessSet: new Uint8Array([7]),
    });

    await expect(
      firstValueFrom(buildSigner().sign({ serializedTx: HexBytes('abcd') })),
    ).rejects.toThrow(/stale or mismatched response/);
  });

  it('surfaces a malformed response parse error', async () => {
    parseResponse.mockImplementation(() => {
      throw new Error('cardano-signature missing witness set');
    });

    await expect(
      firstValueFrom(buildSigner().sign({ serializedTx: HexBytes('abcd') })),
    ).rejects.toThrow(/missing witness set/);
  });

  it('propagates the cancelled error', async () => {
    triggerSpy.mockReturnValue(
      throwError(() => new AirGappedQrExchangeCancelledError()),
    );

    await expect(
      firstValueFrom(buildSigner().sign({ serializedTx: HexBytes('abcd') })),
    ).rejects.toBeInstanceOf(AirGappedQrExchangeCancelledError);
  });

  it('requires the account master fingerprint', async () => {
    await expect(
      firstValueFrom(
        buildSigner({ masterFingerprint: undefined }).sign({
          serializedTx: HexBytes('abcd'),
        }),
      ),
    ).rejects.toThrow(/requires the account master fingerprint/);
  });

  it('keeps the full sign request for a tx just below the firmware size limit', async () => {
    await firstValueFrom(
      buildSigner().sign({
        serializedTx: HexBytes('ab'.repeat(ADA_TX_SIZE_LIMIT - 1)),
      }),
    );

    expect(buildRequest).toHaveBeenCalledTimes(1);
    expect(buildHashRequest).not.toHaveBeenCalled();
    expect(triggerSpy.mock.calls[0][0].detail).toBeUndefined();
  });

  it('falls back to a hash sign request at the firmware size limit', async () => {
    const result = await firstValueFrom(
      buildSigner().sign({
        serializedTx: HexBytes('ab'.repeat(ADA_TX_SIZE_LIMIT)),
      }),
    );

    expect(buildRequest).not.toHaveBeenCalled();
    expect(buildHashRequest).toHaveBeenCalledTimes(1);
    const params = buildHashRequest.mock.calls[0][0];
    expect(Buffer.from(params.txHash).toString('hex')).toBe(TX_ID);
    expect(result.serializedTx).toBe('signed-tx-cbor');
    expect(result.signatureCount).toBe(1);
  });

  it('shows the tx hash and blind signing instruction during hash signing', async () => {
    await firstValueFrom(
      buildSigner().sign({
        serializedTx: HexBytes('ab'.repeat(ADA_TX_SIZE_LIMIT)),
      }),
    );

    const options = triggerSpy.mock.calls[0][0];
    expect(options.detail).toBe(TX_ID);
    expect(options.requestInstructionKey).toBe(
      'v2.air-gapped-qr-exchange.blind-signing.instruction',
    );
    expect(options.instructionKey).toBeUndefined();
    expect(options.expectedResponseType).toBe(KeystoneUrType.TxSignResponse);
    expect(options.request.urType).toBe(KeystoneUrType.TxHashSignRequest);
  });

  it('composes hash signing paths from inputs and extra signers with owned input addresses', async () => {
    ownSignatureKeyPaths.mockReturnValue([
      { role: 0, index: 5 },
      { role: 2, index: 0 },
    ]);

    await firstValueFrom(
      buildSigner().sign({
        serializedTx: HexBytes('ab'.repeat(ADA_TX_SIZE_LIMIT)),
      }),
    );

    const params = buildHashRequest.mock.calls[0][0];
    expect(params.paths).toHaveLength(2);
    expect(params.paths[0].path.slice(3)).toEqual([0, 5]);
    expect(params.paths[1].path.slice(3)).toEqual([2, 0]);
    expect(params.addressList).toEqual(['addr_own']);
  });

  it('merges the raw witness set reply without a request id check', async () => {
    parseResponse.mockImplementation(() => {
      throw new Error('parseTxSignResponse must not run for hash signing');
    });

    const result = await firstValueFrom(
      buildSigner().sign({
        serializedTx: HexBytes('ab'.repeat(ADA_TX_SIZE_LIMIT)),
      }),
    );

    expect(parseHashResponse).toHaveBeenCalledTimes(1);
    expect(result.signatureCount).toBe(1);
  });
});
