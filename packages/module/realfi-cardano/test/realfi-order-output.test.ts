import { Cardano, Serialization } from '@cardano-sdk/core';
import { describe, expect, it } from 'vitest';

import {
  orderOutputIndexByAddress,
  orderOutputIndexByInlineDatum,
} from '../src/realfi-order-output';

// cSpell:disable-next-line
const CHANGE_ADDR =
  'addr_test1qrtdjvvgalpl5pxqftpf5n6mz23ksvg3gwle040z7jarvxquvv2ng0zzk9yx3q627wnledw8gsy9vuljaw0j9vyjs2yqjjnenn';
// cSpell:disable-next-line
const ORDER_ADDR =
  'addr_test1wqg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg0tyy26';

const datumOf = (bytes: string): Serialization.PlutusData =>
  Serialization.PlutusData.newBytes(Buffer.from(bytes, 'hex'));

const ORDER_DATUM = datumOf('deadbeef');
const OTHER_DATUM = datumOf('feedface');

const output = (
  address: string,
  coins: bigint,
  datum?: Serialization.PlutusData,
): Cardano.TxOut => ({
  address: Cardano.PaymentAddress(address),
  value: { coins },
  ...(datum ? { datum: datum.toCore() } : {}),
});

/** A tx whose order output sits at index 1, behind an unrelated output. */
const txCbor = (outputs: Cardano.TxOut[]): string =>
  Serialization.Transaction.fromCore({
    body: { fee: 170_000n, inputs: [], outputs },
    id: Cardano.TransactionId('0'.repeat(64)),
    witness: { signatures: new Map() },
  }).toCbor();

const tx = txCbor([
  output(CHANGE_ADDR, 5_000_000n, OTHER_DATUM),
  output(ORDER_ADDR, 2_000_000n, ORDER_DATUM),
  output(CHANGE_ADDR, 1_000_000n),
]);

describe('orderOutputIndexByAddress', () => {
  it('finds the order output by address rather than assuming position', () => {
    expect(orderOutputIndexByAddress(tx, ORDER_ADDR)).toBe(1);
  });

  it('throws naming the address when the built tx pays it nothing', () => {
    expect(() =>
      orderOutputIndexByAddress(
        txCbor([output(CHANGE_ADDR, 5_000_000n)]),
        ORDER_ADDR,
      ),
    ).toThrow(ORDER_ADDR);
  });
});

describe('orderOutputIndexByInlineDatum', () => {
  it('finds the order output by its inline datum', () => {
    expect(orderOutputIndexByInlineDatum(tx, ORDER_DATUM.toCbor())).toBe(1);
  });

  // A datum-hash output carries no inline data: matching must not fall through
  // to it and claim the wrong index.
  it('throws when no output carries the composed datum inline', () => {
    expect(() =>
      orderOutputIndexByInlineDatum(
        txCbor([output(CHANGE_ADDR, 5_000_000n, OTHER_DATUM)]),
        ORDER_DATUM.toCbor(),
      ),
    ).toThrow('composed order datum');
  });
});
