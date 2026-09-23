import { Cardano, Serialization } from '@cardano-sdk/core';
import * as Crypto from '@cardano-sdk/crypto';
import { mockProviders } from '@cardano-sdk/util-dev';
import { describe, expect, it } from 'vitest';

import { buildComposerTx } from '../../../src/store/composer/build-composer-tx';

import type { BuildComposerTxParams } from '../../../src/store/composer/build-composer-tx';
import type { EraSummary } from '@cardano-sdk/core';
import type {
  CardanoPaymentAddress,
  ComposerRequest,
  RequiredProtocolParameters,
} from '@lace-contract/cardano-context';

const protocolParameters =
  mockProviders.protocolParameters as unknown as RequiredProtocolParameters;

const TIP_SLOT = 100_000;

const eraSummaries: readonly EraSummary[] = [
  {
    parameters: { epochLength: 432_000, slotLength: 1000 },
    start: { slot: 0, time: new Date(0) },
  } as EraSummary,
];

const addressAt = (paymentHash: string): Cardano.PaymentAddress =>
  Cardano.BaseAddress.fromCredentials(
    Cardano.NetworkId.Testnet,
    {
      type: Cardano.CredentialType.KeyHash,
      hash: Crypto.Hash28ByteBase16(paymentHash),
    },
    {
      type: Cardano.CredentialType.KeyHash,
      hash: Crypto.Hash28ByteBase16('ab'.repeat(28)),
    },
  )
    .toAddress()
    .toBech32() as unknown as Cardano.PaymentAddress;

const ownAddress = addressAt('cd'.repeat(28));
const recipient = addressAt('ef'.repeat(28));
const recipientVo = recipient as unknown as CardanoPaymentAddress;

const assetId = `${'11'.repeat(28)}${Buffer.from('TOKEN').toString(
  'hex',
)}` as unknown as Cardano.AssetId;

const utxo = (
  txId: string,
  coins: bigint,
  assets?: Cardano.TokenMap,
): Cardano.Utxo => [
  { txId: txId as Cardano.TransactionId, index: 0, address: ownAddress },
  { address: ownAddress, value: { coins, ...(assets ? { assets } : {}) } },
];

const fatUtxo = utxo('11'.repeat(32), 100_000_000n);
const secondUtxo = utxo('22'.repeat(32), 50_000_000n);
const tokenUtxo = utxo(
  '33'.repeat(32),
  10_000_000n,
  new Map([[assetId, 500n]]),
);

const build = async (
  request: ComposerRequest,
  overrides: Partial<BuildComposerTxParams> = {},
) =>
  buildComposerTx({
    request,
    changeAddress: ownAddress,
    networkMagic: Cardano.NetworkMagics.Preview,
    protocolParameters,
    spendableUtxos: [fatUtxo, secondUtxo, tokenUtxo],
    tipSlot: TIP_SLOT,
    eraSummaries,
    ...overrides,
  });

const decode = (cbor: string) =>
  Serialization.Transaction.fromCbor(
    cbor as unknown as Serialization.TxCBOR,
  ).toCore();

const oneAdaOutput: ComposerRequest = {
  outputs: [{ address: recipientVo, lovelace: '2000000' }],
};

describe('buildComposerTx', () => {
  it('builds a balanced unsigned tx and reports its id and exact fee', async () => {
    const result = await build(oneAdaOutput);

    expect(typeof result.cbor).toBe('string');
    expect(result.txId).toHaveLength(64);
    expect(result.fee).toBeGreaterThan(0n);
    // The reported fee is the one written into the body, so the value the
    // confirmation surface shows is the value the tx actually pays.
    expect(decode(result.cbor).body.fee).toBe(result.fee);
  });

  // ===================================================================
  // Execution units. Declaring a fixed ex-units budget without
  // evaluating the script overpays every script tx, so the composer
  // refuses to carry scripts at all until an evaluator exists. These
  // assertions are what stops a script path being reintroduced with a
  // guessed budget.
  // ===================================================================
  it('declares no redeemers, scripts or collateral, so no execution units are ever priced', async () => {
    const { cbor } = await build({
      ...oneAdaOutput,
      metadata: [{ label: '674', json: '{"msg":["hi"]}' }],
    });

    const core = decode(cbor);
    expect(core.witness.redeemers ?? []).toEqual([]);
    expect(core.witness.scripts ?? []).toEqual([]);
    expect(core.witness.datums ?? []).toEqual([]);
    expect(core.body.collaterals ?? []).toEqual([]);
    expect(core.body.collateralReturn).toBeUndefined();
    expect(core.body.totalCollateral).toBeUndefined();
    expect(core.body.scriptIntegrityHash).toBeUndefined();
  });

  it('sets the validity interval from the tip slot and the era slot length', async () => {
    const { cbor } = await build({ ...oneAdaOutput, validitySeconds: 600 });

    expect(decode(cbor).body.validityInterval).toEqual({
      invalidHereafter: TIP_SLOT + 600,
    });
  });

  it('sets both validity bounds when a start is requested', async () => {
    const { cbor } = await build({
      ...oneAdaOutput,
      validitySeconds: 600,
      validityStartSeconds: 60,
    });

    expect(decode(cbor).body.validityInterval).toEqual({
      invalidBefore: TIP_SLOT + 60,
      invalidHereafter: TIP_SLOT + 600,
    });
  });

  it('keeps every requested output, in order, ahead of the change output', async () => {
    const second = addressAt(
      '12'.repeat(28),
    ) as unknown as CardanoPaymentAddress;

    const { cbor } = await build({
      outputs: [
        { address: recipientVo, lovelace: '2000000' },
        { address: second, lovelace: '3000000' },
      ],
    });

    const { outputs } = decode(cbor).body;
    expect(outputs[0].address).toBe(recipient);
    expect(outputs[0].value.coins).toBe(2_000_000n);
    expect(outputs[1].value.coins).toBe(3_000_000n);
    // Change lands last and returns to the change address.
    expect(outputs[outputs.length - 1].address).toBe(ownAddress);
  });

  it('sends native assets on an output', async () => {
    const { cbor } = await build({
      outputs: [
        {
          address: recipientVo,
          lovelace: '2000000',
          assets: [{ assetId: assetId as unknown as string, quantity: '100' }],
        },
      ],
    });

    expect(decode(cbor).body.outputs[0].value.assets?.get(assetId)).toBe(100n);
  });

  it('adds repeated asset ids together within one output', async () => {
    const { cbor } = await build({
      outputs: [
        {
          address: recipientVo,
          lovelace: '2000000',
          assets: [
            { assetId: assetId as unknown as string, quantity: '100' },
            { assetId: assetId as unknown as string, quantity: '25' },
          ],
        },
      ],
    });

    expect(decode(cbor).body.outputs[0].value.assets?.get(assetId)).toBe(125n);
  });

  it('tops an under-funded output up to the protocol minimum', async () => {
    const { cbor } = await build({
      outputs: [
        {
          address: recipientVo,
          lovelace: '0',
          assets: [{ assetId: assetId as unknown as string, quantity: '10' }],
        },
      ],
    });

    // An assets-only output may request '0'; it must still be spendable.
    expect(decode(cbor).body.outputs[0].value.coins).toBeGreaterThan(0n);
  });

  it('leaves an output that already covers the minimum untouched', async () => {
    const { cbor } = await build(oneAdaOutput);

    expect(decode(cbor).body.outputs[0].value.coins).toBe(2_000_000n);
  });

  it('attaches metadata under each requested label and hashes the auxiliary data', async () => {
    const { cbor } = await build({
      ...oneAdaOutput,
      metadata: [
        { label: '674', json: '{"msg":["composed"]}' },
        { label: '721', json: '{"name":"nft"}' },
      ],
    });

    const core = decode(cbor);
    expect(core.body.auxiliaryDataHash).toBeDefined();
    expect([...(core.auxiliaryData?.blob?.keys() ?? [])]).toEqual([674n, 721n]);
  });

  it('forces a selected UTxO into the input set', async () => {
    const { cbor } = await build({
      ...oneAdaOutput,
      selectedInputs: [{ txId: secondUtxo[0].txId, index: 0 }],
    });

    expect(
      decode(cbor).body.inputs.some(
        input => input.txId === secondUtxo[0].txId && input.index === 0,
      ),
    ).toBe(true);
  });

  it('does not count a selected UTxO twice when the balancer tops up', async () => {
    const { cbor } = await build({
      outputs: [{ address: recipientVo, lovelace: '120000000' }],
      selectedInputs: [{ txId: secondUtxo[0].txId, index: 0 }],
    });

    const references = decode(cbor).body.inputs.map(
      input => `${input.txId}#${input.index}`,
    );
    expect(new Set(references).size).toBe(references.length);
    // 120 ADA needs more than the 50 ADA forced input alone.
    expect(references.length).toBeGreaterThan(1);
  });

  it('sends change to an overridden change address', async () => {
    const { cbor } = await build(oneAdaOutput, { changeAddress: recipient });

    const { outputs } = decode(cbor).body;
    expect(outputs[outputs.length - 1].address).toBe(recipient);
  });

  it.each([
    ['no outputs', { outputs: [] }, 'at least one output'],
    [
      'a negative lovelace amount',
      { outputs: [{ address: recipientVo, lovelace: '-1' }] },
      'negative amount of lovelace',
    ],
    [
      'a zero asset quantity',
      {
        outputs: [
          {
            address: recipientVo,
            lovelace: '2000000',
            assets: [{ assetId: assetId as unknown as string, quantity: '0' }],
          },
        ],
      },
      'non-positive quantity',
    ],
    [
      'a non-numeric lovelace amount',
      { outputs: [{ address: recipientVo, lovelace: '1.5' }] },
      'not a whole number',
    ],
    [
      'a non-numeric asset quantity',
      {
        outputs: [
          {
            address: recipientVo,
            lovelace: '2000000',
            assets: [
              { assetId: assetId as unknown as string, quantity: 'lots' },
            ],
          },
        ],
      },
      'not a whole number',
    ],
    [
      'a non-integer metadata label',
      {
        ...oneAdaOutput,
        metadata: [{ label: 'msg', json: '{}' }],
      },
      'not a non-negative integer',
    ],
    [
      'malformed metadata JSON',
      {
        ...oneAdaOutput,
        metadata: [{ label: '674', json: '{oops' }],
      },
      'not valid JSON',
    ],
    [
      'a selected input the account cannot spend',
      {
        ...oneAdaOutput,
        selectedInputs: [{ txId: '99'.repeat(32), index: 3 }],
      },
      'not among the account',
    ],
  ])('rejects %s', async (_label, request, message) => {
    await expect(build(request as ComposerRequest)).rejects.toThrow(message);
  });

  it('rejects a request when the account has nothing to spend', async () => {
    await expect(build(oneAdaOutput, { spendableUtxos: [] })).rejects.toThrow(
      'no spendable UTxOs',
    );
  });

  // ===================================================================
  // Coded failures. The side-effect routes on `code` alone, so a throw
  // that carries none reads as a build fault and reaches the generic
  // copy — which is what these two mistakes, both the user's own, must
  // not do.
  // ===================================================================
  it('codes an undecodable output address as a request mistake', async () => {
    const rejection = build({
      outputs: [
        {
          address: 'addr_test1notanaddress' as unknown as CardanoPaymentAddress,
          lovelace: '2000000',
        },
      ],
    });

    await expect(rejection).rejects.toThrow('not a Cardano address');
    await expect(rejection).rejects.toMatchObject({ code: 'invalid-address' });
  });

  it('codes an amount the account cannot cover as a request mistake', async () => {
    await expect(
      build({
        outputs: [{ address: recipientVo, lovelace: '900000000000' }],
      }),
    ).rejects.toMatchObject({
      code: 'insufficient-funds',
      // Tagged rather than replaced, so the balancer still names the shortfall.
      name: 'InputSelectionError',
    });
  });

  it('rejects an output whose token bundle exceeds the protocol value size', async () => {
    await expect(
      build(
        {
          outputs: [
            {
              address: recipientVo,
              lovelace: '2000000',
              assets: [
                { assetId: assetId as unknown as string, quantity: '10' },
              ],
            },
          ],
        },
        {
          protocolParameters: {
            ...protocolParameters,
            maxValueSize: 1,
          } as RequiredProtocolParameters,
        },
      ),
    ).rejects.toThrow('maximum token bundle size');
  });

  it('surfaces the validity-interval failure when era summaries are missing', async () => {
    await expect(build(oneAdaOutput, { eraSummaries: [] })).rejects.toThrow(
      'no Cardano era summaries available',
    );
  });
});
