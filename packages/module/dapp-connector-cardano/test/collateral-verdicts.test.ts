import { Cardano, Serialization } from '@cardano-sdk/core';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { TxSignErrorCode } from '../src/common/api-error';

import {
  ACCOUNT_ID,
  buildTx,
  CASE_A_TX_CBOR,
  CASE_B_MESSAGE,
  CASE_B_TX_CBOR,
  CASE_C_TX_CBOR,
  CASE_E_TX_CBOR,
  CHAINED_COLLATERAL_INPUT,
  CHAINED_COLLATERAL_UTXO,
  createCollateralApi,
  FOREIGN_ADDRESS,
  MIXED_OWN_RETURN_TX_CBOR,
  ORIGIN,
  OWN_ADDRESS,
  OWN_COLLATERAL_INPUT,
  OWN_COLLATERAL_UTXO,
  senderContext,
  utxo,
} from './support/collateral-api-fixture';

import type { AccountUtxoMap } from '@lace-contract/cardano-context';

/**
 * The rule cases as the dApp sees them. The classification itself is
 * unit-tested in `cardano-context`; what only this level can show is that a
 * verdict becomes the right CIP-30 outcome, and that an allow really reaches
 * consent instead of resolving for some unrelated reason.
 *
 * `partialSign: true` on the allow paths isolates them to the collateral
 * guard: it skips the pre-existing foreign-signature check, which would
 * otherwise reject these fixtures' unresolvable spend input regardless of the
 * verdict.
 */
describe('a block verdict becomes a TxSignError the dApp can read', () => {
  it('case (b) refuses with the verbatim copy', async () => {
    const { api } = createCollateralApi();

    await expect(
      api.signTx(CASE_B_TX_CBOR, false, senderContext),
    ).rejects.toMatchObject({
      name: 'TxSignError',
      code: TxSignErrorCode.ProofGeneration,
      info: CASE_B_MESSAGE,
    });
  });

  it('case (b) refuses identically with partialSign=true -- the rule sits outside that branch', async () => {
    const { api } = createCollateralApi();

    await expect(
      api.signTx(CASE_B_TX_CBOR, true, senderContext),
    ).rejects.toMatchObject({
      code: TxSignErrorCode.ProofGeneration,
      info: CASE_B_MESSAGE,
    });
  });
});

describe('an allow verdict reaches consent and signs', () => {
  it.each([
    {
      label: 'case (a): all-own collateral, own return',
      txCbor: CASE_A_TX_CBOR,
    },
    { label: 'case (c): dApp-sponsored collateral', txCbor: CASE_C_TX_CBOR },
    {
      label: 'case (e): all-own collateral, no return',
      txCbor: CASE_E_TX_CBOR,
    },
    {
      label:
        'mixed: known own collateral beside one the wallet does not hold, own return',
      txCbor: MIXED_OWN_RETURN_TX_CBOR,
    },
  ])('$label', async ({ txCbor }) => {
    const { api, userConfirmationRequest, signTransaction } =
      createCollateralApi();

    await expect(api.signTx(txCbor, true, senderContext)).resolves.toBe(
      'witness-set-cbor',
    );

    // Not merely "did not throw": it reached consent and then delegated.
    expect(userConfirmationRequest).toHaveBeenCalledWith(
      senderContext.sender,
      'signTx',
      { txHex: txCbor, partialSign: true },
    );
    expect(signTransaction).toHaveBeenCalledWith(txCbor, true, ORIGIN);
  });
});

describe('the ownership authority the verdict is read against', () => {
  it('includes chained own outputs: a chained-only collateral input is own', async () => {
    const txCbor = buildTx({
      collaterals: [CHAINED_COLLATERAL_INPUT],
      collateralReturnAddress: FOREIGN_ADDRESS,
    });
    const { api } = createCollateralApi({
      ownershipUtxos$: of({ [ACCOUNT_ID]: [] } as unknown as AccountUtxoMap),
      resolveChainedInputs: vi.fn().mockReturnValue([CHAINED_COLLATERAL_UTXO]),
    });

    await expect(
      api.signTx(txCbor, false, senderContext),
    ).rejects.toMatchObject({ code: TxSignErrorCode.ProofGeneration });
  });

  // Two directions, so neither source alone satisfies both. A UTxO the
  // available view FILTERS OUT (collateral-reserved) must still be own, and a
  // UTxO the authority holds but settled does not (own pending change) must
  // also be own. Reading one dep cannot pass both.
  it('a collateral-reserved UTxO, absent from the available view, is still own', async () => {
    const txCbor = buildTx({
      collaterals: [OWN_COLLATERAL_INPUT],
      collateralReturnAddress: FOREIGN_ADDRESS,
    });
    const { api } = createCollateralApi({
      // The reserved UTxO is filtered out of the spendable view in production.
      accountUtxos$: of({ [ACCOUNT_ID]: [] } as unknown as AccountUtxoMap),
      ownershipUtxos$: of({
        [ACCOUNT_ID]: [OWN_COLLATERAL_UTXO],
      } as unknown as AccountUtxoMap),
    });

    await expect(
      api.signTx(txCbor, false, senderContext),
    ).rejects.toMatchObject({ info: CASE_B_MESSAGE });
  });

  it('an own PENDING output, absent from the settled set, is still own', async () => {
    const txCbor = buildTx({
      collaterals: [OWN_COLLATERAL_INPUT],
      collateralReturnAddress: FOREIGN_ADDRESS,
    });
    // What `selectCollateralOwnershipUtxos` produces after an ordinary Send:
    // the pending change is in the authority even though the provider has not
    // yet reported it as settled. Before LW-15390's ownership repair this
    // signed, because the authority was the settled set alone.
    const { api } = createCollateralApi({
      accountUtxos$: of({
        [ACCOUNT_ID]: [OWN_COLLATERAL_UTXO],
      } as unknown as AccountUtxoMap),
      ownershipUtxos$: of({
        [ACCOUNT_ID]: [OWN_COLLATERAL_UTXO],
      } as unknown as AccountUtxoMap),
    });

    await expect(
      api.signTx(txCbor, false, senderContext),
    ).rejects.toMatchObject({ info: CASE_B_MESSAGE });
  });

  it('leaves `getUtxos` on `accountUtxos$`, byte-unchanged', async () => {
    const availableOnly = utxo(
      Cardano.TransactionId('9'.repeat(64)),
      0,
      OWN_ADDRESS,
    );
    const { api } = createCollateralApi({
      accountUtxos$: of({
        [ACCOUNT_ID]: [availableOnly],
      } as unknown as AccountUtxoMap),
      ownershipUtxos$: of({
        [ACCOUNT_ID]: [
          utxo(Cardano.TransactionId('8'.repeat(64)), 0, OWN_ADDRESS),
        ],
      } as unknown as AccountUtxoMap),
    });

    const result = await api.getUtxos(undefined, undefined, senderContext);

    expect(result).toHaveLength(1);
    expect(
      Serialization.TransactionUnspentOutput.fromCbor(
        Serialization.TxCBOR(result![0]),
      ).toCore()[0].txId,
    ).toBe(availableOnly[0].txId);
  });
});
