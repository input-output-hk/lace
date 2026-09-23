import { BigNumber, HexBytes } from '@lace-lib/util';
import { describe, expect, it } from 'vitest';

import { getSettledTransactionData } from '../../src/components/send-flow/get-settled-transaction-data';

import type { SendFlowSliceState } from '@lace-contract/send-flow';

const transfers = [
  {
    amount: '5',
    receiverAddress: 'addr_test1',
    tokenKind: 'shielded',
    type: 'a'.repeat(64),
  },
];

const serializedTx = HexBytes.fromUTF8(JSON.stringify({ transfers }));

const settledFormState = {
  status: 'Form',
  fees: [{ amount: BigNumber(1n), tokenId: 'dust' }],
  serializedTx,
} as unknown as SendFlowSliceState;

const asState = (overrides: Record<string, unknown>): SendFlowSliceState =>
  ({ ...settledFormState, ...overrides } as unknown as SendFlowSliceState);

describe('getSettledTransactionData', () => {
  it('returns the decoded pretty-printed payload for a settled build', () => {
    const data = getSettledTransactionData(settledFormState);

    expect(data).not.toBeNull();
    expect(JSON.parse(data as string)).toEqual({ transfers });
    // Pretty-printed for the disclosure box, not a single-line blob.
    expect(data).toContain('\n');
  });

  it('returns null while a rebuild is pending after a form edit (stale serializedTx)', () => {
    // applyFormDataChange keeps serializedTx (needed to discard the previous
    // tx) but clears fees and moves off 'Form' — the kept payload no longer
    // matches the form and must not be shown.
    const editedState = asState({ status: 'FormPendingValidation', fees: [] });

    expect(getSettledTransactionData(editedState)).toBeNull();
  });

  it('returns null after a failed rebuild keeps the previous serializedTx', () => {
    // txBuildResulted's failure branch returns to 'Form' with fees cleared
    // while retaining the last successful build's serializedTx.
    const failedRebuildState = asState({ fees: [] });

    expect(getSettledTransactionData(failedRebuildState)).toBeNull();
  });

  it('returns null while the build is in flight even though fees are still empty-cleared', () => {
    const buildingState = asState({ status: 'FormTxBuilding', fees: [] });

    expect(getSettledTransactionData(buildingState)).toBeNull();
  });

  it('returns null when no transaction has been built yet', () => {
    const freshFormState = asState({ serializedTx: '', fees: [] });

    expect(getSettledTransactionData(freshFormState)).toBeNull();
  });

  it('returns null for closed flow states without build fields', () => {
    expect(
      getSettledTransactionData({
        status: 'Idle',
      } as unknown as SendFlowSliceState),
    ).toBeNull();
  });

  it('returns null on the Failure-to-Form retry form holding the signer proven binary alongside fees', () => {
    // confirmationCompleted overwrites serializedTx with the proven binary;
    // Failure.confirmed -> Form keeps it together with the last build's fees.
    const retryFormState = asState({
      serializedTx: HexBytes.fromByteArray(
        new Uint8Array([0x01, 0x02, 0x80, 0xff]),
      ),
    });

    expect(getSettledTransactionData(retryFormState)).toBeNull();
  });

  it('returns null when the payload is not decodable JSON', () => {
    const foreignPayloadState = asState({
      serializedTx: HexBytes.fromUTF8('not json'),
    });

    expect(getSettledTransactionData(foreignPayloadState)).toBeNull();
  });

  it('still shows the payload when the build succeeded with a warning (fees set, confirm disabled)', () => {
    // Insufficient-dust builds keep confirm disabled but the payload is fresh.
    const warningState = asState({ confirmButtonEnabled: false });

    expect(getSettledTransactionData(warningState)).not.toBeNull();
  });
});
