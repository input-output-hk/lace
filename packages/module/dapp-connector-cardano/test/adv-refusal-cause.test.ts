/**
 * ADVERSARIAL AUDIT of the two REFUSAL CAUSES, not of the refusal itself.
 *
 * Every case in this file still REFUSES. Nothing here is a bypass: the rule
 * remains fail-closed and no body below yields a witness. What is under attack
 * is the sentence the user and the dApp are handed — `'states-other-network'`
 * asserts "targets a different network" and `'states-no-network'` asserts "does
 * not state which network it is for", and both are stated as fact.
 *
 * The `TRUE COPY` cases are the fidelity guard: they stop this file being
 * made green by collapsing the distinction again.
 *
 * The root cause in one line: the rule had THREE inputs — "names this network",
 * "names another network", "could not be read" — and only TWO answers, so the
 * third was folded into whichever arm the `===` comparison happened to reach.
 * There are now four answers, the fourth being "these bytes did not parse".
 */
import { Cardano, Serialization } from '@cardano-sdk/core';
import { Hash28ByteBase16 } from '@cardano-sdk/crypto';
import { describe, expect, it } from 'vitest';

import {
  cardanoNetworkName,
  cborNetworkBindingRefusal,
  cborStatedNetworkLabel,
  networkBindingRefusal,
  networkBindingRefusalMessage,
  statedNetworkLabel,
} from '../src/common/store/utils/network-binding';

/** The served account in every case below: a PREPROD wallet. Its magic is what
 * lets the copy name the wallet's side exactly. */
const WALLET_MAGIC = 1;
const WALLET_NETWORK = cardanoNetworkName(WALLET_MAGIC); // 'preprod'

const sentence = (
  cause: Parameters<typeof networkBindingRefusalMessage>[0],
  statedNetwork: 'mainnet' | 'testnet' | null = null,
): string =>
  networkBindingRefusalMessage(cause, {
    statedNetwork,
    walletNetwork: WALLET_NETWORK,
  });

const OTHER_NETWORK_SENTENCE = sentence('states-other-network', 'mainnet');
const NO_NETWORK_SENTENCE = sentence('states-no-network');
const UNREADABLE_SENTENCE = sentence('states-unreadable-element');
const UNDECODABLE_SENTENCE = sentence('undecodable');

const credential = (byte: string): Cardano.Credential => ({
  hash: Hash28ByteBase16(byte.repeat(56)),
  type: Cardano.CredentialType.KeyHash,
});

const addressOn = (networkId: Cardano.NetworkId, byte: string): string =>
  Cardano.BaseAddress.fromCredentials(
    networkId,
    credential(byte),
    credential('b'),
  )
    .toAddress()
    .toBech32();

const TESTNET_ADDRESS = addressOn(Cardano.NetworkId.Testnet, 'a');
const MAINNET_ADDRESS = addressOn(Cardano.NetworkId.Mainnet, 'c');

/** A bech32 string with a valid checksum that is not an address at all. */
const NOT_AN_ADDRESS_BECH32 =
  'pool1pu5jlj4q9w9jlxeu370a3c9myx47md5j5m2str0naunn2q3lkdy';

const bodyWithOutputs = (addresses: string[]): Cardano.TxBody =>
  ({
    fee: 170_000n,
    inputs: [{ index: 0, txId: 'a'.repeat(64) }],
    outputs: addresses.map(address => ({
      address,
      value: { coins: 1_000_000n },
    })),
  } as unknown as Cardano.TxBody);

/** The sentence a signing path actually hands out for this body, or `null`. */
const sentenceFor = (
  body: Cardano.TxBody,
  networkId: Cardano.NetworkId,
): string | null => {
  const refusal = networkBindingRefusal(body, networkId);
  return refusal === null
    ? null
    : sentence(refusal, statedNetworkLabel(body, networkId));
};

const cborSentenceFor = (
  txCbor: string,
  networkId: Cardano.NetworkId,
): string | null => {
  const refusal = cborNetworkBindingRefusal(txCbor, networkId);
  return refusal === null
    ? null
    : sentence(refusal, cborStatedNetworkLabel(txCbor, networkId));
};

/** A real, serialisable transaction paying to `address`. */
const txCborPayingTo = (address: string): string =>
  new Serialization.Transaction(
    Serialization.TransactionBody.fromCore(bodyWithOutputs([address])),
    Serialization.TransactionWitnessSet.fromCore({ signatures: new Map() }),
  )
    .toCbor()
    .toString();

describe('the wallet network is named from the SDK, not a second list', () => {
  it.each([
    [764_824_073, 'mainnet'],
    [1, 'preprod'],
    [2, 'preview'],
    // Sanchonet is named, not reported as "network 4".
    [4, 'sanchonet'],
  ])('names magic %i as %s', (magic, name) => {
    expect(cardanoNetworkName(magic)).toBe(name);
  });

  it('quotes an unknown magic back rather than guessing at it', () => {
    expect(cardanoNetworkName(999)).toBe('network 999');
  });
});

describe('TRUE COPY — the fidelity guard', () => {
  it('a mainnet body seen by a testnet wallet does target another network', () => {
    expect(
      sentenceFor(
        bodyWithOutputs([MAINNET_ADDRESS]),
        Cardano.NetworkId.Testnet,
      ),
    ).toBe(OTHER_NETWORK_SENTENCE);
  });

  it('a body with no network-bearing element really does state nothing', () => {
    expect(sentenceFor(bodyWithOutputs([]), Cardano.NetworkId.Testnet)).toBe(
      NO_NETWORK_SENTENCE,
    );
  });

  it('a body whose every element names this network is not refused at all', () => {
    expect(
      sentenceFor(
        bodyWithOutputs([TESTNET_ADDRESS, TESTNET_ADDRESS]),
        Cardano.NetworkId.Testnet,
      ),
    ).toBeNull();
  });
});

describe('an element we could not READ is reported as exactly that', () => {
  it('an undecodable address alone is NOT reported as a conflict', () => {
    // The wallet decoded nothing. It has no element naming any network, and
    // certainly none naming another one — `'unreadable'` merely fails `===`.
    expect(
      sentenceFor(
        bodyWithOutputs(['not-an-address']),
        Cardano.NetworkId.Testnet,
      ),
    ).toBe(UNREADABLE_SENTENCE);
  });

  it('every READABLE element naming THIS network is not called a conflict', () => {
    const body = bodyWithOutputs([TESTNET_ADDRESS, 'not-an-address']);

    // Proof the conflict claim has no witness: drop the unreadable output and
    // the same rule signs the transaction.
    expect(
      sentenceFor(
        bodyWithOutputs([TESTNET_ADDRESS]),
        Cardano.NetworkId.Testnet,
      ),
    ).toBeNull();

    expect(sentenceFor(body, Cardano.NetworkId.Testnet)).toBe(
      UNREADABLE_SENTENCE,
    );
  });

  it('a bech32 that is not an address is not reported as a cross-network transaction', () => {
    // A pool id pasted into an output is a dApp bug, not a wrong-network
    // target; calling it a conflict sends its author to fix the one thing
    // that is not broken.
    expect(
      sentenceFor(
        bodyWithOutputs([NOT_AN_ADDRESS_BECH32]),
        Cardano.NetworkId.Testnet,
      ),
    ).toBe(UNREADABLE_SENTENCE);
  });

  it('a missing address field is not reported as a cross-network transaction', () => {
    // Same class, reachable from a decoded body whose output lost its address.
    expect(
      sentenceFor(
        bodyWithOutputs([undefined as unknown as string]),
        Cardano.NetworkId.Testnet,
      ),
    ).toBe(UNREADABLE_SENTENCE);
  });
});

describe('bytes that will not parse are reported as bytes that will not parse', () => {
  const cbor = txCborPayingTo(MAINNET_ADDRESS);
  const mainnetAddressHex = Cardano.Address.fromBech32(MAINNET_ADDRESS)
    .toBytes()
    .toString();
  const truncated = cbor.slice(0, -2);

  it('the truncated bytes provably still carry the mainnet address', () => {
    // Not an assumption: the refused bytes contain the very address whose
    // network tag the next two tests claim is absent.
    expect(cbor).toContain(mainnetAddressHex);
    expect(truncated).toContain(mainnetAddressHex);
  });

  it('dropping one byte reports a decode failure, not silence about the network', () => {
    expect(cborSentenceFor(cbor, Cardano.NetworkId.Testnet)).toBe(
      OTHER_NETWORK_SENTENCE,
    );
    // Same transaction, one byte shorter. The bytes still state mainnet (see
    // above), so "does not state which network it is for" would be false;
    // only the decoder gave up, and that is what is said.
    expect(cborSentenceFor(truncated, Cardano.NetworkId.Testnet)).toBe(
      UNDECODABLE_SENTENCE,
    );
  });

  it('a mainnet wallet is told the bytes did not parse, not that they name no network', () => {
    expect(cborSentenceFor(cbor, Cardano.NetworkId.Mainnet)).toBeNull();
    // A dApp author who reads "does not state which network" adds a
    // `networkId` field and re-sends; the bytes still will not parse. The
    // message has to name the actual defect.
    expect(cborSentenceFor(truncated, Cardano.NetworkId.Mainnet)).toBe(
      UNDECODABLE_SENTENCE,
    );
  });

  it('the two decode failures are distinguished, and neither is a conflict or silence', () => {
    // One family — "could not be read" — at two granularities: an element the
    // body carries, and bytes that never became a body. They get different
    // causes because they are different facts, and NEITHER is reported as a
    // conflict or as silence about the network.
    expect(
      networkBindingRefusal(
        bodyWithOutputs(['not-an-address']),
        Cardano.NetworkId.Testnet,
      ),
    ).toBe('states-unreadable-element');
    expect(
      cborNetworkBindingRefusal('deadbeef', Cardano.NetworkId.Testnet),
    ).toBe('undecodable');
  });
});

describe('WRONG BY OMISSION — the conflict the one-bit check cannot see', () => {
  it('a preprod body is accepted by a preview wallet, with no message at all', () => {
    // Both testnets share network id 0, so the evidence walk cannot separate
    // them and the caller is never given a cause to render.
    expect(Cardano.ChainIds.Preprod.networkId).toBe(
      Cardano.ChainIds.Preview.networkId,
    );
    expect(
      networkBindingRefusal(
        bodyWithOutputs([TESTNET_ADDRESS]),
        Cardano.ChainIds.Preview.networkId,
      ),
    ).toBeNull();
  });
});

describe('the refusal text leaks nothing about the body or the served account', () => {
  it('renders one of exactly three sentences, whatever the body contains', () => {
    const distinctiveAddress = addressOn(Cardano.NetworkId.Mainnet, 'd');
    const bodies: Cardano.TxBody[] = [
      bodyWithOutputs([]),
      bodyWithOutputs([distinctiveAddress]),
      bodyWithOutputs(['not-an-address']),
      {
        ...bodyWithOutputs([]),
        withdrawals: [
          {
            quantity: 1n,
            stakeAddress: Cardano.RewardAddress.fromCredentials(
              Cardano.NetworkId.Mainnet,
              credential('e'),
            )
              .toAddress()
              .toBech32(),
          },
        ],
      } as unknown as Cardano.TxBody,
    ];

    const sentences = bodies.map(body =>
      sentenceFor(body, Cardano.NetworkId.Testnet),
    );

    expect(new Set(sentences)).toEqual(
      new Set([
        OTHER_NETWORK_SENTENCE,
        NO_NETWORK_SENTENCE,
        UNREADABLE_SENTENCE,
      ]),
    );
    for (const sentence of sentences) {
      expect(sentence).not.toContain('addr');
      expect(sentence).not.toContain('stake');
      // The ONLY interpolations are the two network labels. The wallet's name
      // comes from the served account, never from the body; the transaction's
      // is one of two fixed words. Nothing the dApp supplied is echoed.
      expect(sentence).toContain(WALLET_NETWORK);
      expect(sentence).not.toMatch(/\d/);
    }
  });
});
