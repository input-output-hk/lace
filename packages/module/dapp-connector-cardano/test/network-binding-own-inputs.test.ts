/**
 * The POSITIVE half of the network-binding rule: what makes a body that names
 * no network at all acceptable anyway.
 *
 * A stake registration whose change is below min-ada has no outputs, no
 * withdrawals and no `networkId` field — nothing the evidence walk can read —
 * and signed fine before the rule existed. The only thing left to reason from
 * is what it SPENDS: an outpoint exists solely in the UTxO set of the chain
 * whose history produced it, so a body spending only this wallet's own
 * outpoints cannot be applied anywhere else.
 *
 * Every case here is about that one arm. The other two causes are unaffected
 * by ownership and the last two tests below hold that line — ownership is
 * additional evidence, never an override.
 */
import { Cardano, Serialization } from '@cardano-sdk/core';
import { Hash28ByteBase16 } from '@cardano-sdk/crypto';
import { describe, expect, it } from 'vitest';

import {
  cborNetworkBindingRefusal,
  networkBindingRefusal,
} from '../src/common/store/utils/network-binding';

const TESTNET = Cardano.NetworkId.Testnet;

const credential = (byte: string): Cardano.Credential => ({
  hash: Hash28ByteBase16(byte.repeat(56)),
  type: Cardano.CredentialType.KeyHash,
});

const addressOn = (networkId: Cardano.NetworkId): string =>
  Cardano.BaseAddress.fromCredentials(
    networkId,
    credential('a'),
    credential('b'),
  )
    .toAddress()
    .toBech32();

const OWN_INPUT: Cardano.TxIn = {
  index: 0,
  txId: Cardano.TransactionId('11'.repeat(32)),
};
const SECOND_OWN_INPUT: Cardano.TxIn = {
  index: 3,
  txId: Cardano.TransactionId('22'.repeat(32)),
};
const FOREIGN_INPUT: Cardano.TxIn = {
  index: 0,
  txId: Cardano.TransactionId('99'.repeat(32)),
};

const OWN_UTXO_REFS = new Set([
  `${OWN_INPUT.txId}#${OWN_INPUT.index}`,
  `${SECOND_OWN_INPUT.txId}#${SECOND_OWN_INPUT.index}`,
]);

/** The shape CSL emits when it folds a sub-min-ada change into the fee. */
const zeroOutputBody = (inputs: Cardano.TxIn[]): Cardano.TxBody =>
  ({
    certificates: [
      {
        __typename: Cardano.CertificateType.StakeRegistration,
        stakeCredential: credential('c'),
      },
    ],
    fee: 2_170_000n,
    inputs,
    outputs: [],
  } as unknown as Cardano.TxBody);

describe('a body that states no network, judged by what it spends', () => {
  it('is ACCEPTED when every input is an own UTxO on the active network', () => {
    expect(
      networkBindingRefusal(
        zeroOutputBody([OWN_INPUT, SECOND_OWN_INPUT]),
        TESTNET,
        OWN_UTXO_REFS,
      ),
    ).toBeNull();
  });

  it('is refused when ONE input among the own ones is foreign', () => {
    // Not "at least one own input": an outpoint nobody vouches for is an
    // outpoint the wallet cannot place on any chain, and the arm this widens
    // is the one that used to refuse everything.
    expect(
      networkBindingRefusal(
        zeroOutputBody([OWN_INPUT, FOREIGN_INPUT]),
        TESTNET,
        OWN_UTXO_REFS,
      ),
    ).toBe('states-no-network');
  });

  it('is refused when the index differs, not only the transaction id', () => {
    expect(
      networkBindingRefusal(
        zeroOutputBody([{ ...OWN_INPUT, index: 1 }]),
        TESTNET,
        OWN_UTXO_REFS,
      ),
    ).toBe('states-no-network');
  });

  it('is refused when it spends NOTHING, rather than passing vacuously', () => {
    // `[].every(…)` is true. A body with no inputs would sail through an
    // unguarded "every input is ours", and it is bound by nothing at all.
    expect(
      networkBindingRefusal(zeroOutputBody([]), TESTNET, OWN_UTXO_REFS),
    ).toBe('states-no-network');
  });

  it('is refused when the caller supplies no ownership evidence at all', () => {
    // The fail-closed default every call site that holds no UTxO set gets.
    expect(networkBindingRefusal(zeroOutputBody([OWN_INPUT]), TESTNET)).toBe(
      'states-no-network',
    );
  });

  it("counts a SUB transaction's inputs too", () => {
    // A witness over the parent covers the sub body, so an outpoint only the
    // sub spends is an outpoint this signature authorises.
    const body = {
      ...zeroOutputBody([OWN_INPUT]),
      subTransactions: [
        { body: { fee: 0n, inputs: [FOREIGN_INPUT], outputs: [] } },
      ],
    } as unknown as Cardano.TxBody;

    expect(networkBindingRefusal(body, TESTNET, OWN_UTXO_REFS)).toBe(
      'states-no-network',
    );
  });
});

describe('ownership is additional evidence, never an override', () => {
  it('does not rescue a body naming ANOTHER network', () => {
    const body = {
      ...zeroOutputBody([OWN_INPUT]),
      outputs: [
        {
          address: addressOn(Cardano.NetworkId.Mainnet),
          value: { coins: 1_000_000n },
        },
      ],
    } as unknown as Cardano.TxBody;

    expect(networkBindingRefusal(body, TESTNET, OWN_UTXO_REFS)).toBe(
      'states-other-network',
    );
  });

  it('does not rescue a body holding an element that cannot be read', () => {
    const body = {
      ...zeroOutputBody([OWN_INPUT]),
      outputs: [{ address: 'not-an-address', value: { coins: 1_000_000n } }],
    } as unknown as Cardano.TxBody;

    expect(networkBindingRefusal(body, TESTNET, OWN_UTXO_REFS)).toBe(
      'states-unreadable-element',
    );
  });
});

describe('the CBOR entry point carries the ownership set through', () => {
  const txCbor = (inputs: Cardano.TxIn[]): string =>
    new Serialization.Transaction(
      Serialization.TransactionBody.fromCore(zeroOutputBody(inputs)),
      Serialization.TransactionWitnessSet.fromCore({ signatures: new Map() }),
    ).toCbor();

  it('accepts the wire form of an all-own-input body', () => {
    expect(
      cborNetworkBindingRefusal(txCbor([OWN_INPUT]), TESTNET, OWN_UTXO_REFS),
    ).toBeNull();
  });

  it('refuses the SAME bytes with no ownership set supplied', () => {
    expect(cborNetworkBindingRefusal(txCbor([OWN_INPUT]), TESTNET)).toBe(
      'states-no-network',
    );
  });
});

describe('a verdict needs bytes with ONE reading', () => {
  /**
   * A transaction body map stating key 0 (inputs) twice: the attacker's
   * outpoint first, a decoy the wallet owns last.
   *
   * The SDK resolves the repeat LAST-WINS, so a guard reading the decoded
   * model sees only the decoy while the signature commits to bytes that also
   * name the other outpoint. Neither half of the rule can tell — the decoder
   * threw one reading away before either saw the body — so the caller that
   * holds the bytes reports the ambiguity and the rule refuses on it.
   */
  const duplicateInputsKeyCbor = (first: string, last: string): string => {
    const writer = new Serialization.CborWriter();
    writer.writeStartArray(4);
    writer.writeStartMap(3);
    for (const txId of [first, last]) {
      writer.writeInt(0n);
      writer.writeStartArray(1);
      writer.writeStartArray(2);
      writer.writeByteString(Buffer.from(txId, 'hex'));
      writer.writeInt(0n);
    }
    writer.writeInt(2n);
    writer.writeInt(200_000n);
    writer.writeStartMap(0);
    writer.writeBoolean(true);
    writer.writeNull();
    return writer.encodeAsHex();
  };

  it('refuses when the LAST reading is all-own but the bytes name another outpoint', () => {
    const txCbor = duplicateInputsKeyCbor(FOREIGN_INPUT.txId, OWN_INPUT.txId);

    // The decoder really does hand the rule the own outpoint alone…
    expect(
      Serialization.Transaction.fromCbor(Serialization.TxCBOR(txCbor))
        .toCore()
        .body.inputs.map(({ txId }) => txId),
    ).toEqual([OWN_INPUT.txId]);
    // …and the bytes really do still carry the other one.
    expect(txCbor).toContain(FOREIGN_INPUT.txId);

    expect(cborNetworkBindingRefusal(txCbor, TESTNET, OWN_UTXO_REFS)).toBe(
      'states-unreadable-element',
    );
  });

  it('refuses a repeat written non-canonically, where a hex search would miss it', () => {
    // `00` and `1800` are both key 0. Only a decoded key comparison collides.
    const writer = new Serialization.CborWriter();
    writer.writeStartArray(4);
    writer.writeStartMap(2);
    writer.writeInt(0n);
    writer.writeStartArray(1);
    writer.writeStartArray(2);
    writer.writeByteString(Buffer.from(OWN_INPUT.txId, 'hex'));
    writer.writeInt(0n);
    writer.writeInt(2n);
    writer.writeInt(200_000n);
    writer.writeStartMap(0);
    writer.writeBoolean(true);
    writer.writeNull();
    const canonical = writer.encodeAsHex();
    // Splice a second key-0 entry encoded as `1800`, ahead of the fee.
    const spliced = canonical.replace(
      'a200',
      'a3180081825820' + FOREIGN_INPUT.txId + '0000',
    );

    // Decodable, and last-wins to the own input — so this is the duplicate
    // check answering, not the undecodable fallback.
    expect(
      Serialization.Transaction.fromCbor(Serialization.TxCBOR(spliced))
        .toCore()
        .body.inputs.map(({ txId }) => txId),
    ).toEqual([OWN_INPUT.txId]);
    expect(cborNetworkBindingRefusal(spliced, TESTNET, OWN_UTXO_REFS)).toBe(
      'states-unreadable-element',
    );
  });

  it('still accepts ordinary, unambiguous bytes', () => {
    // The guard above must not cost the case this whole arm exists for.
    const txCbor = new Serialization.Transaction(
      Serialization.TransactionBody.fromCore(zeroOutputBody([OWN_INPUT])),
      Serialization.TransactionWitnessSet.fromCore({ signatures: new Map() }),
    ).toCbor();

    expect(
      cborNetworkBindingRefusal(txCbor, TESTNET, OWN_UTXO_REFS),
    ).toBeNull();
  });
});
