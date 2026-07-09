import { HexBytes } from '@lace-sdk/util';
import { firstValueFrom } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CardanoTrezorMobileTransactionSigner } from '../../src/signing/cardano-trezor-mobile-transaction-signer';

import type { Cardano } from '@cardano-sdk/core';
import type { Bip32PublicKeyHex } from '@cardano-sdk/crypto';

const txHash = 'aabb';

const hoisted = vi.hoisted(() => {
  const mockCoreBody: {
    inputs: never[];
    outputs: never[];
    fee: { toString: () => string };
    withdrawals?: { stakeAddress: string; quantity: bigint }[];
    certificates?: { __type: string }[];
    mint?: Map<string, bigint>;
  } = {
    inputs: [],
    outputs: [],
    fee: { toString: () => '0' },
  };
  const mockTxBody = {
    toCore: vi.fn().mockReturnValue(mockCoreBody),
    hash: vi.fn().mockReturnValue('aabb'),
    outputs: vi.fn().mockReturnValue([]),
    collateralReturn: vi.fn().mockReturnValue(undefined),
    hasTaggedSets: vi.fn().mockReturnValue(false),
  };
  const mockWitnessSet = { setVkeys: vi.fn() };
  const mockTransaction = {
    body: vi.fn().mockReturnValue(mockTxBody),
    auxiliaryData: vi.fn().mockReturnValue({}),
    witnessSet: vi.fn().mockReturnValue(mockWitnessSet),
  };
  const mockSignedTx = { toCbor: vi.fn().mockReturnValue('signed-tx-cbor') };
  return {
    mockCoreBody,
    mockTransaction,
    mockSignedTx,
    matchSigningMode: vi.fn().mockReturnValue(0),
    cardanoSignTransaction: vi.fn(),
    mapWithdrawals: vi.fn(),
    mapCerts: vi.fn(),
    mapTxIns: vi.fn().mockReturnValue([]),
  };
});

vi.mock('@cardano-sdk/core', () => ({
  Serialization: {
    Transaction: Object.assign(
      vi.fn().mockImplementation(() => hoisted.mockSignedTx),
      {
        fromCbor: vi.fn().mockReturnValue(hoisted.mockTransaction),
      },
    ),
    TxCBOR: vi.fn((cbor: string) => cbor),
    CborSet: { fromCore: vi.fn() },
    VkeyWitness: { fromCore: vi.fn() },
  },
  // Fixture-friendly AssetId helpers: encode `<policyId>.<assetName>` in the
  // map key so the test can predict the grouping output without depending on
  // the SDK's CBOR-aware implementation.
  Cardano: {
    AssetId: {
      getPolicyId: (key: string) => key.split('.')[0],
      getAssetName: (key: string) => key.split('.')[1] ?? '',
    },
  },
}));

vi.mock('@cardano-sdk/crypto', () => ({
  Ed25519PublicKeyHex: (v: string) => v,
  Ed25519SignatureHex: (v: string) => v,
}));

vi.mock('@cardano-sdk/hardware-trezor', () => ({
  TrezorKeyAgent: { matchSigningMode: hoisted.matchSigningMode },
  mapAuxiliaryData: vi.fn(),
  mapCerts: hoisted.mapCerts,
  mapRequiredSigners: vi.fn(),
  mapTxIns: hoisted.mapTxIns,
  mapTxOuts: vi.fn(),
  mapWithdrawals: hoisted.mapWithdrawals,
  toTxOut: vi.fn(),
}));

vi.mock('@cardano-sdk/key-management', () => ({
  util: { createTxInKeyPathMap: vi.fn().mockResolvedValue(new Map()) },
}));

vi.mock('@lace-contract/cardano-context', () => ({
  createInputResolver: vi.fn(),
}));

vi.mock('../../src/mobile/trezor-connect-bridge', () => ({
  getTrezorConnect: async () => ({
    cardanoSignTransaction: hoisted.cardanoSignTransaction,
  }),
}));

const baseProps = {
  accountIndex: 0,
  chainId: { networkId: 0, networkMagic: 1 } as Cardano.ChainId,
  extendedAccountPublicKey: 'abcd' as unknown as Bip32PublicKeyHex,
  knownAddresses: [],
  utxo: [],
};

describe('CardanoTrezorMobileTransactionSigner', () => {
  beforeEach(() => {
    hoisted.cardanoSignTransaction.mockReset();
    hoisted.matchSigningMode.mockClear().mockReturnValue(0);
    hoisted.mapWithdrawals.mockClear().mockReturnValue(undefined);
    hoisted.mapCerts.mockClear().mockReturnValue(undefined);
    hoisted.mapTxIns.mockClear().mockReturnValue([]);
    hoisted.mockCoreBody.withdrawals = undefined;
    hoisted.mockCoreBody.certificates = undefined;
    hoisted.mockCoreBody.mint = undefined;
  });

  it('signs a transaction and returns assembled CBOR with signature count', async () => {
    hoisted.cardanoSignTransaction.mockResolvedValue({
      success: true,
      payload: {
        hash: txHash,
        witnesses: [
          { type: 1, pubKey: 'pubkey1', signature: 'sig1' },
          { type: 1, pubKey: 'pubkey2', signature: 'sig2' },
        ],
      },
    });

    const signer = new CardanoTrezorMobileTransactionSigner(baseProps);
    const result = await firstValueFrom(
      signer.sign({ serializedTx: HexBytes('cbor-hex') }),
    );

    expect(hoisted.cardanoSignTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ signingMode: 0 }),
    );
    expect(hoisted.matchSigningMode).toHaveBeenCalled();
    expect(result.serializedTx).toBe('signed-tx-cbor');
    expect(result.signatureCount).toBe(2);
  });

  it('passes derivationType when provided', async () => {
    hoisted.cardanoSignTransaction.mockResolvedValue({
      success: true,
      payload: { hash: txHash, witnesses: [] },
    });

    const signer = new CardanoTrezorMobileTransactionSigner({
      ...baseProps,
      derivationType: 'ICARUS_TREZOR',
    });
    await firstValueFrom(signer.sign({ serializedTx: HexBytes('cbor-hex') }));

    expect(hoisted.cardanoSignTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ derivationType: 2 }),
    );
  });

  it('throws when Trezor returns a failure payload', async () => {
    hoisted.cardanoSignTransaction.mockResolvedValue({
      success: false,
      payload: { error: 'User cancelled' },
    });

    const signer = new CardanoTrezorMobileTransactionSigner(baseProps);

    await expect(
      firstValueFrom(signer.sign({ serializedTx: HexBytes('cbor-hex') })),
    ).rejects.toThrow(/Trezor cardanoSignTransaction failed: User cancelled/);
  });

  it('throws when the device returns a different transaction hash', async () => {
    hoisted.cardanoSignTransaction.mockResolvedValue({
      success: true,
      payload: { hash: 'ffff', witnesses: [] },
    });

    const signer = new CardanoTrezorMobileTransactionSigner(baseProps);

    await expect(
      firstValueFrom(signer.sign({ serializedTx: HexBytes('cbor-hex') })),
    ).rejects.toThrow(/different transaction hash/);
  });

  it('omits derivationType from the Trezor call when not provided', async () => {
    hoisted.cardanoSignTransaction.mockResolvedValue({
      success: true,
      payload: { hash: txHash, witnesses: [] },
    });

    const signer = new CardanoTrezorMobileTransactionSigner(baseProps);
    await firstValueFrom(signer.sign({ serializedTx: HexBytes('cbor-hex') }));

    const [callArgs] = hoisted.cardanoSignTransaction.mock.calls;
    expect(callArgs[0]).not.toHaveProperty('derivationType');
  });

  it('calls mapWithdrawals when body.withdrawals is present', async () => {
    const mockWithdrawals: NonNullable<
      typeof hoisted.mockCoreBody.withdrawals
    > = [{ stakeAddress: 'addr1', quantity: BigInt(1000) }];
    hoisted.mockCoreBody.withdrawals = mockWithdrawals;
    hoisted.mapWithdrawals.mockReturnValue([
      { stakeAddress: 'addr1', amount: '1000' },
    ]);
    hoisted.cardanoSignTransaction.mockResolvedValue({
      success: true,
      payload: { hash: txHash, witnesses: [] },
    });

    const signer = new CardanoTrezorMobileTransactionSigner(baseProps);
    await firstValueFrom(signer.sign({ serializedTx: HexBytes('cbor-hex') }));

    expect(hoisted.mapWithdrawals).toHaveBeenCalledWith(
      mockWithdrawals,
      expect.any(Object),
    );
  });

  it('does not call mapWithdrawals when body.withdrawals is absent', async () => {
    hoisted.cardanoSignTransaction.mockResolvedValue({
      success: true,
      payload: { hash: txHash, witnesses: [] },
    });

    const signer = new CardanoTrezorMobileTransactionSigner(baseProps);
    await firstValueFrom(signer.sign({ serializedTx: HexBytes('cbor-hex') }));

    expect(hoisted.mapWithdrawals).not.toHaveBeenCalled();
  });

  it('calls mapCerts when body.certificates is present', async () => {
    const mockCerts: NonNullable<typeof hoisted.mockCoreBody.certificates> = [
      { __type: 'StakeKeyRegistration' },
    ];
    hoisted.mockCoreBody.certificates = mockCerts;
    hoisted.mapCerts.mockReturnValue([{ type: 0 }]);
    hoisted.cardanoSignTransaction.mockResolvedValue({
      success: true,
      payload: { hash: txHash, witnesses: [] },
    });

    const signer = new CardanoTrezorMobileTransactionSigner(baseProps);
    await firstValueFrom(signer.sign({ serializedTx: HexBytes('cbor-hex') }));

    expect(hoisted.mapCerts).toHaveBeenCalledWith(
      mockCerts,
      expect.any(Object),
    );
  });

  it('does not call mapCerts when body.certificates is absent', async () => {
    hoisted.cardanoSignTransaction.mockResolvedValue({
      success: true,
      payload: { hash: txHash, witnesses: [] },
    });

    const signer = new CardanoTrezorMobileTransactionSigner(baseProps);
    await firstValueFrom(signer.sign({ serializedTx: HexBytes('cbor-hex') }));

    expect(hoisted.mapCerts).not.toHaveBeenCalled();
  });

  it('groups mint assets by policyId with canonical token ordering and forwards them to Trezor', async () => {
    // Tokens listed out of canonical order; helper must sort assetNames by
    // length-then-bytewise, and policyIds bytewise.
    hoisted.mockCoreBody.mint = new Map<string, bigint>([
      ['policyB.short', 1n],
      ['policyB.longerName', 2n],
      ['policyA.x', 3n],
    ]);
    hoisted.cardanoSignTransaction.mockResolvedValue({
      success: true,
      payload: { hash: txHash, witnesses: [] },
    });

    const signer = new CardanoTrezorMobileTransactionSigner(baseProps);
    await firstValueFrom(signer.sign({ serializedTx: HexBytes('cbor-hex') }));

    expect(hoisted.cardanoSignTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        mint: [
          {
            policyId: 'policyA',
            tokenAmounts: [{ assetNameBytes: 'x', mintAmount: '3' }],
          },
          {
            policyId: 'policyB',
            tokenAmounts: [
              { assetNameBytes: 'short', mintAmount: '1' },
              { assetNameBytes: 'longerName', mintAmount: '2' },
            ],
          },
        ],
      }),
    );
  });

  it('omits mint from the Trezor call when body.mint is absent', async () => {
    hoisted.cardanoSignTransaction.mockResolvedValue({
      success: true,
      payload: { hash: txHash, witnesses: [] },
    });

    const signer = new CardanoTrezorMobileTransactionSigner(baseProps);
    await firstValueFrom(signer.sign({ serializedTx: HexBytes('cbor-hex') }));

    const [callArgs] = hoisted.cardanoSignTransaction.mock.calls;
    expect((callArgs[0] as { mint?: unknown }).mint).toBeUndefined();
  });
});
