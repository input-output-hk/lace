import { Serialization } from '@cardano-sdk/core';
import {
  mergeVkeyWitnesses,
  TransactionUnderSignedError,
} from '@lace-contract/cardano-context';
import { HexBytes } from '@lace-lib/util';
import { describe, expect, it } from 'vitest';

import { CardanoCustodyBuildFailedError } from '../../src/custody/cardano-custody-errors';
import {
  assembleCustodyTransaction,
  expectSignerWitness,
  paymentKeyHashOf,
  vkeyWitnessSetOf,
} from '../../src/custody/cardano-custody-witnesses';

import {
  agentKey,
  buildResultOf,
  grantSpendShape,
  record,
  SPONSOR_ADDRESS,
  sponsorKey,
  strangerKey,
} from './custody-fixtures';

const { transaction, bodyHash, resolvedInputs } = buildResultOf(
  grantSpendShape(),
);

/** A witness set with the sponsor's vkey and one more field. */
const withExtraField = (key: number, encodedValue: string): string => {
  const writer = new Serialization.CborWriter();
  writer.writeStartMap(2);
  writer.writeInt(0);
  const set = new Serialization.CborReader(
    vkeyWitnessSetOf([sponsorKey.witnessOver(bodyHash)]),
  );
  set.readStartMap();
  set.readInt();
  writer.writeEncodedValue(set.readEncodedValue());
  writer.writeInt(key);
  writer.writeEncodedValue(Buffer.from(encodedValue, 'hex'));
  return writer.encodeAsHex();
};

const expectSponsor = async (witnessSet: string) =>
  expectSignerWitness({
    signer: 'sponsor',
    witnessSet,
    bodyHash,
    keyHash: sponsorKey.keyHash,
  });

describe('expectSignerWitness', () => {
  it('returns the one valid witness by the expected key', async () => {
    const witness = sponsorKey.witnessOver(bodyHash);

    await expect(expectSponsor(vkeyWitnessSetOf([witness]))).resolves.toEqual(
      witness,
    );
  });

  it('accepts witness set CBOR in upper case', async () => {
    await expect(
      expectSponsor(
        vkeyWitnessSetOf([sponsorKey.witnessOver(bodyHash)]).toUpperCase(),
      ),
    ).resolves.toBeDefined();
  });

  it.each([
    ['not hex', 'xyz'],
    ['an empty witness set', 'a0'],
    ['an empty vkey set', 'a10080'],
    ['bootstrap witnesses beside the vkeys', withExtraField(2, '80')],
    ['redeemers beside the vkeys', withExtraField(5, 'a0')],
    [
      'trailing bytes',
      `${vkeyWitnessSetOf([sponsorKey.witnessOver(bodyHash)])}00`,
    ],
  ])('refuses %s as malformed', async (_, witnessSet) => {
    await expect(expectSponsor(witnessSet)).rejects.toMatchObject({
      signer: 'sponsor',
      reason: 'malformed',
    });
  });

  it('refuses an extra witness by another key', async () => {
    await expect(
      expectSponsor(
        vkeyWitnessSetOf([
          sponsorKey.witnessOver(bodyHash),
          strangerKey.witnessOver(bodyHash),
        ]),
      ),
    ).rejects.toMatchObject({ reason: 'unexpected-key' });
  });

  it('refuses any invalid signature in the set', async () => {
    await expect(
      expectSponsor(
        vkeyWitnessSetOf([
          sponsorKey.witnessOver(bodyHash),
          {
            ...strangerKey.witnessOver(bodyHash),
            signature: sponsorKey.witnessOver(bodyHash).signature,
          },
        ]),
      ),
    ).rejects.toMatchObject({ reason: 'invalid-signature' });
  });
});

describe('paymentKeyHashOf', () => {
  it('reads the payment key hash of a key address', () => {
    expect(paymentKeyHashOf(SPONSOR_ADDRESS)).toBe(sponsorKey.keyHash);
  });

  it('has none for a script address', () => {
    expect(paymentKeyHashOf(record.address)).toBeUndefined();
  });
});

describe('assembleCustodyTransaction', () => {
  it('keeps the body and witness fields while adding the vkeys', () => {
    const signed = assembleCustodyTransaction({
      transaction,
      witnesses: [
        agentKey.witnessOver(bodyHash),
        sponsorKey.witnessOver(bodyHash),
      ],
      resolvedInputs,
    });

    const original = Serialization.Transaction.fromCbor(
      Serialization.TxCBOR(transaction),
    );
    const merged = Serialization.Transaction.fromCbor(
      Serialization.TxCBOR(signed),
    );
    expect(merged.body().toCbor()).toBe(original.body().toCbor());
    expect(merged.witnessSet().redeemers()?.toCbor()).toBe(
      original.witnessSet().redeemers()?.toCbor(),
    );
    expect(merged.witnessSet().vkeys()?.values()).toHaveLength(2);
  });

  it('refuses a transaction that held another key witness already', () => {
    const witnessed = mergeVkeyWitnesses(HexBytes(transaction), [
      strangerKey.witnessOver(bodyHash),
    ]);

    expect(() =>
      assembleCustodyTransaction({
        transaction: witnessed,
        witnesses: [
          agentKey.witnessOver(bodyHash),
          sponsorKey.witnessOver(bodyHash),
        ],
        resolvedInputs,
      }),
    ).toThrow(CardanoCustodyBuildFailedError);
  });

  it('refuses a transaction a required key has not signed', () => {
    expect(() =>
      assembleCustodyTransaction({
        transaction,
        witnesses: [agentKey.witnessOver(bodyHash)],
        resolvedInputs,
      }),
    ).toThrow(TransactionUnderSignedError);
  });
});
