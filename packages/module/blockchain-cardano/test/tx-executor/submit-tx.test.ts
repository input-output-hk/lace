import { Cardano, Serialization } from '@cardano-sdk/core';
import { AccountId } from '@lace-contract/wallet-repo';
import { Ok, Err } from '@lace-lib/util';
import { firstValueFrom, of } from 'rxjs';
import { describe, expect, it } from 'vitest';

import { makeSubmitTx } from '../../src/tx-executor-implementation/submit-tx';

import type { AnyAddress } from '@lace-contract/addresses';
import type { SideEffectDependencies } from '@lace-contract/module';

const testAccountId = AccountId('test-account');
const testAddress =
  'addr_test1qphhr294v0w0rzgk7kz4ynsp8hwt82ha6nsp8yk6h04fhzsuryus5g7pm3lq85msee5pdtqlnv2crdc83kk2tvhsefcsu2snle';

const otherAddress =
  'addr_test1qqt3r9kd56aq9ajynjkz8hdfw3kc0pcv3tpzug8azxls62tvvz7nw9gmznn65g4ksrrfvyzhz52knc3mqxdyya47gz2qmcjmcq';

const previousTxId = Cardano.TransactionId(
  '39a7a284c2a0948189dc45dec670211cd4d72f7b66c5726c08d9b3df11e44d58',
);

const ownUtxo: Cardano.Utxo = [
  {
    txId: previousTxId,
    index: 0,
    address: Cardano.PaymentAddress(testAddress),
  },
  {
    address: Cardano.PaymentAddress(testAddress),
    value: { coins: 10_000_000n },
  },
];

const mockAddress: AnyAddress = {
  accountId: testAccountId,
  address: testAddress as AnyAddress['address'],
  blockchainName: 'Cardano',
};

const mainnetChainId = Cardano.ChainIds.Mainnet;

const emptyWitness: Cardano.Witness = { signatures: new Map() };

const buildCbor = (body: Cardano.TxBody): string =>
  Serialization.Transaction.fromCore({
    body,
    id: '0'.repeat(64) as Cardano.TransactionId,
    witness: emptyWitness,
  }).toCbor();

describe('makeSubmitTx', () => {
  it('propagates provider submit errors without emitting metadata', async () => {
    const error = new Error('boom');
    const deps = {
      cardanoProvider: {
        submitTx: () => of(Err(error)),
      },
      txExecutorCardano: {
        cardanoChainId$: of(mainnetChainId),
        cardanoAccountUtxos$: of({ [testAccountId]: [ownUtxo] }),
        cardanoAddresses$: of([mockAddress]),
      },
    } as unknown as SideEffectDependencies;

    const submit = makeSubmitTx(deps);
    const result = await firstValueFrom(
      submit({
        accountId: testAccountId,
        blockchainName: 'Cardano',
        blockchainSpecificSendFlowData: {},
        serializedTx: buildCbor({
          inputs: [{ txId: previousTxId, index: 0 }],
          outputs: [
            {
              address: Cardano.PaymentAddress(otherAddress),
              value: { coins: 9_800_000n },
            },
          ],
          fee: 200_000n,
        }),
      }),
    );

    expect(result.success).toBe(false);
  });

  it('returns txId plus Cardano in-flight metadata on success', async () => {
    const cbor = buildCbor({
      inputs: [{ txId: previousTxId, index: 0 }],
      outputs: [
        {
          address: Cardano.PaymentAddress(otherAddress),
          value: { coins: 3_000_000n },
        },
        {
          address: Cardano.PaymentAddress(testAddress),
          value: { coins: 6_800_000n },
        },
      ],
      fee: 200_000n,
    });

    const returnedTxId = Serialization.Transaction.fromCbor(
      Serialization.TxCBOR(cbor),
    ).getId();

    const deps = {
      cardanoProvider: {
        submitTx: () => of(Ok(String(returnedTxId))),
      },
      txExecutorCardano: {
        cardanoChainId$: of(mainnetChainId),
        cardanoAccountUtxos$: of({ [testAccountId]: [ownUtxo] }),
        cardanoAddresses$: of([mockAddress]),
      },
    } as unknown as SideEffectDependencies;

    const submit = makeSubmitTx(deps);
    const result = await firstValueFrom(
      submit({
        accountId: testAccountId,
        blockchainName: 'Cardano',
        blockchainSpecificSendFlowData: {},
        serializedTx: cbor,
      }),
    );

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.txId).toBe(String(returnedTxId));
    expect(result.blockchainSpecificActivityMetadata).toEqual({
      Cardano: {
        consumedInputs: [{ txId: previousTxId, index: 0 }],
        producedOutputs: [
          [
            { txId: returnedTxId, index: 0 },
            {
              address: Cardano.PaymentAddress(otherAddress),
              value: { coins: 3_000_000n },
            },
          ],
          [
            { txId: returnedTxId, index: 1 },
            {
              address: Cardano.PaymentAddress(testAddress),
              value: { coins: 6_800_000n },
            },
          ],
        ],
      },
    });
  });

  it('returns success with undefined metadata when tx does not involve the account', async () => {
    const foreignTxId = Cardano.TransactionId(
      '4c4e67bafa15e742c13c592b65c8f74c769cd7d9af04c848099672d1ba391b49',
    );
    const cbor = buildCbor({
      inputs: [{ txId: foreignTxId, index: 0 }],
      outputs: [
        {
          address: Cardano.PaymentAddress(otherAddress),
          value: { coins: 1_000_000n },
        },
      ],
      fee: 200_000n,
    });
    const returnedTxId = Serialization.Transaction.fromCbor(
      Serialization.TxCBOR(cbor),
    ).getId();

    const deps = {
      cardanoProvider: {
        submitTx: () => of(Ok(String(returnedTxId))),
      },
      txExecutorCardano: {
        cardanoChainId$: of(mainnetChainId),
        cardanoAccountUtxos$: of({}),
        cardanoAddresses$: of([]),
      },
    } as unknown as SideEffectDependencies;

    const submit = makeSubmitTx(deps);
    const result = await firstValueFrom(
      submit({
        accountId: testAccountId,
        blockchainName: 'Cardano',
        blockchainSpecificSendFlowData: {},
        serializedTx: cbor,
      }),
    );

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.blockchainSpecificActivityMetadata).toBeUndefined();
  });

  it('errors when chainId is not available', async () => {
    const deps = {
      cardanoProvider: {
        submitTx: () => of(Ok('ignored')),
      },
      txExecutorCardano: {
        cardanoChainId$: of(undefined),
        cardanoAccountUtxos$: of({}),
        cardanoAddresses$: of([]),
      },
    } as unknown as SideEffectDependencies;

    const submit = makeSubmitTx(deps);
    const result = await firstValueFrom(
      submit({
        accountId: testAccountId,
        blockchainName: 'Cardano',
        blockchainSpecificSendFlowData: {},
        serializedTx: buildCbor({
          inputs: [{ txId: previousTxId, index: 0 }],
          outputs: [],
          fee: 0n,
        }),
      }),
    );

    expect(result.success).toBe(false);
  });
});
