import { Cardano, Serialization } from '@cardano-sdk/core';
import { HexBytes } from '@lace-lib/util';
import { firstValueFrom, of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { CollateralOwnershipError } from '../../src/signing/assert-collateral-ownership';
import { withCollateralOwnershipGuard } from '../../src/signing/guarded-transaction-signer';
import { createInputResolver } from '../../src/util';

import type {
  CardanoSignRequest,
  CardanoSignResult,
  CardanoTransactionSigner,
  CardanoTransactionSignerContext,
} from '../../src/signing/types';
import type { GroupedAddress } from '@cardano-sdk/key-management';

const cred = (hash: string): Cardano.Credential => ({
  type: Cardano.CredentialType.KeyHash,
  hash: hash as never,
});

const baseAddress = (
  paymentHash: string,
  stakeHash: string,
): Cardano.PaymentAddress =>
  Cardano.BaseAddress.fromCredentials(
    Cardano.NetworkId.Testnet,
    cred(paymentHash),
    cred(stakeHash),
  )
    .toAddress()
    .toBech32() as Cardano.PaymentAddress;

const WALLET_ADDRESS = baseAddress('aa'.repeat(28), 'bb'.repeat(28));
const FOREIGN_ADDRESS = baseAddress('cc'.repeat(28), 'dd'.repeat(28));

const txId32 = (byte: string) => byte.repeat(32) as Cardano.TransactionId;
const OWN_COLLATERAL: Cardano.TxIn = { txId: txId32('ab'), index: 0 };
const SPEND_INPUT: Cardano.TxIn = { txId: txId32('cd'), index: 0 };

const OWN_COLLATERAL_UTXO = [
  { ...OWN_COLLATERAL, address: WALLET_ADDRESS },
  { address: WALLET_ADDRESS, value: { coins: 5_000_000n } },
] as Cardano.Utxo;

const buildTxCbor = (fields: {
  collaterals?: Cardano.TxIn[];
  collateralReturn?: Cardano.TxOut;
}) =>
  Serialization.Transaction.fromCore({
    id: txId32('ef'),
    body: {
      inputs: [SPEND_INPUT],
      outputs: [{ address: WALLET_ADDRESS, value: { coins: 1_000_000n } }],
      fee: 170_000n,
      ...fields,
    },
    witness: { signatures: new Map() },
  } as Cardano.Tx).toCbor();

// case (a): own collateral, own return -> allow.
const CASE_A_TX = buildTxCbor({
  collaterals: [OWN_COLLATERAL],
  collateralReturn: { address: WALLET_ADDRESS, value: { coins: 5_000_000n } },
});
// case (b): own collateral, foreign return -> block.
const CASE_B_TX = buildTxCbor({
  collaterals: [OWN_COLLATERAL],
  collateralReturn: { address: FOREIGN_ADDRESS, value: { coins: 5_000_000n } },
});

const context = (
  overrides: Partial<CardanoTransactionSignerContext> = {},
): CardanoTransactionSignerContext =>
  ({
    knownAddresses: [{ address: WALLET_ADDRESS } as unknown as GroupedAddress],
    collateralInputResolver: createInputResolver([OWN_COLLATERAL_UTXO]),
    ...overrides,
  } as unknown as CardanoTransactionSignerContext);

const stubSigner = () => {
  const sign = vi.fn((_request: CardanoSignRequest) =>
    of({
      serializedTx: HexBytes('deadbeef'),
      signatureCount: 1,
    } as CardanoSignResult),
  );
  const signer: CardanoTransactionSigner = { sign };
  return { signer, sign };
};

const refusalOf = async (
  guarded: CardanoTransactionSigner,
  txCbor: string,
): Promise<unknown> => {
  try {
    await firstValueFrom(guarded.sign({ serializedTx: HexBytes(txCbor) }));
    return undefined;
  } catch (error) {
    return error;
  }
};

describe('the guard fails closed', () => {
  it('blocks with CollateralOwnershipError, never a TypeError, when collateralInputResolver is missing at runtime', async () => {
    const { signer, sign } = stubSigner();
    const guarded = withCollateralOwnershipGuard(
      signer,
      context({ collateralInputResolver: undefined }),
    );

    await expect(
      firstValueFrom(guarded.sign({ serializedTx: HexBytes(CASE_A_TX) })),
    ).rejects.toBeInstanceOf(CollateralOwnershipError);
    expect(sign).not.toHaveBeenCalled();
  });

  it('blocks with CollateralOwnershipError, never a TypeError, when knownAddresses is missing at runtime (an as-unknown-as cast bypassing the compiler)', async () => {
    const { signer, sign } = stubSigner();
    const guarded = withCollateralOwnershipGuard(
      signer,
      context({ knownAddresses: undefined as unknown as GroupedAddress[] }),
    );

    await expect(
      firstValueFrom(guarded.sign({ serializedTx: HexBytes(CASE_A_TX) })),
    ).rejects.toBeInstanceOf(CollateralOwnershipError);
    expect(sign).not.toHaveBeenCalled();
  });

  it('blocks with CollateralOwnershipError, never signing, when the tx CBOR does not decode', async () => {
    const { signer, sign } = stubSigner();
    const guarded = withCollateralOwnershipGuard(signer, context());

    await expect(
      firstValueFrom(
        guarded.sign({ serializedTx: HexBytes('deadbeef'.repeat(4)) }),
      ),
    ).rejects.toBeInstanceOf(CollateralOwnershipError);
    expect(sign).not.toHaveBeenCalled();
  });
});

describe('withCollateralOwnershipGuard', () => {
  it('blocks a case-(b) transaction (own collateral, foreign return) without delegating to the wrapped signer', async () => {
    const { signer, sign } = stubSigner();
    const guarded = withCollateralOwnershipGuard(signer, context());

    const caught = await refusalOf(guarded, CASE_B_TX);

    expect(caught).toBeInstanceOf(CollateralOwnershipError);
    expect((caught as CollateralOwnershipError).case).toBe(
      'foreign-collateral-return',
    );
    expect(sign).not.toHaveBeenCalled();
  });

  it('delegates to the wrapped signer on an allow verdict (case a: own collateral, own return)', async () => {
    const { signer, sign } = stubSigner();
    const guarded = withCollateralOwnershipGuard(signer, context());

    const request = { serializedTx: HexBytes(CASE_A_TX) };
    const result = await firstValueFrom(guarded.sign(request));

    expect(sign).toHaveBeenCalledWith(request);
    expect(result.serializedTx).toBe('deadbeef');
  });

  it('blocks a case-(b) transaction whose collateral the local layer lacks but the resolver traces to a wallet address -- the UTxO the wallet has not caught up with yet', async () => {
    const { signer, sign } = stubSigner();
    const localLayer = createInputResolver([]);
    const resolveInput = vi.fn(
      async (input: Cardano.TxIn) =>
        (await localLayer.resolveInput(input)) ??
        (input.txId === OWN_COLLATERAL.txId ? OWN_COLLATERAL_UTXO[1] : null),
    );
    const guarded = withCollateralOwnershipGuard(
      signer,
      context({ collateralInputResolver: { resolveInput } }),
    );

    const caught = await refusalOf(guarded, CASE_B_TX);

    expect(resolveInput).toHaveBeenCalledWith(OWN_COLLATERAL);
    expect((caught as CollateralOwnershipError).case).toBe(
      'foreign-collateral-return',
    );
    expect(sign).not.toHaveBeenCalled();
  });

  it('delegates on a case-(b) shape whose collateral input the resolver cannot resolve at all: an unidentifiable input is not ours (LW-15506)', async () => {
    const { signer, sign } = stubSigner();
    const guarded = withCollateralOwnershipGuard(
      signer,
      context({ collateralInputResolver: createInputResolver([]) }),
    );

    const request = { serializedTx: HexBytes(CASE_B_TX) };
    await firstValueFrom(guarded.sign(request));

    expect(sign).toHaveBeenCalledWith(request);
  });

  it('delegates when the resolver throws: a throw is not resolving, and an unresolved input is not ours', async () => {
    const { signer, sign } = stubSigner();
    const guarded = withCollateralOwnershipGuard(
      signer,
      context({
        collateralInputResolver: {
          resolveInput: async () => Promise.reject(new Error('provider down')),
        },
      }),
    );

    const request = { serializedTx: HexBytes(CASE_B_TX) };
    await firstValueFrom(guarded.sign(request));

    expect(sign).toHaveBeenCalledWith(request);
  });

  it('delegates on case (c) when the resolver proves the collateral foreign', async () => {
    const { signer, sign } = stubSigner();
    const guarded = withCollateralOwnershipGuard(
      signer,
      context({
        collateralInputResolver: createInputResolver([
          [
            { ...OWN_COLLATERAL, address: FOREIGN_ADDRESS },
            { address: FOREIGN_ADDRESS, value: { coins: 5_000_000n } },
          ] as Cardano.Utxo,
        ]),
      }),
    );

    const request = { serializedTx: HexBytes(CASE_B_TX) };
    await firstValueFrom(guarded.sign(request));

    expect(sign).toHaveBeenCalledWith(request);
  });
});
