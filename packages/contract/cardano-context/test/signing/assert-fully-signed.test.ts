import { describe, expect, it, vi } from 'vitest';

import {
  assertTransactionFullySigned,
  TransactionUnderSignedError,
} from '../../src/signing/assert-fully-signed';

const getUniqueSignerKeyHashes = vi.hoisted(() => vi.fn());
vi.mock('../../src/signing/getUniqueSigners', () => ({
  getUniqueSignerKeyHashes,
}));

// hashEd25519PublicKey is identity here, so a vkey's public key IS its key hash.
vi.mock('@lace-lib/core', () => ({
  hashEd25519PublicKey: (publicKey: string) => publicKey,
}));

const txWithVkeys = (vkeys: [string, string][] | undefined) =>
  ({
    toCore: () => ({}),
    witnessSet: () => ({
      vkeys: () => (vkeys ? { toCore: () => vkeys } : undefined),
    }),
  } as never);

describe('assertTransactionFullySigned', () => {
  it('passes when every required signer has a witness', () => {
    getUniqueSignerKeyHashes.mockReturnValue(new Set(['kh1', 'kh2']));
    expect(() => {
      assertTransactionFullySigned(
        txWithVkeys([
          ['kh1', 'sig1'],
          ['kh2', 'sig2'],
        ]),
        [],
      );
    }).not.toThrow();
  });

  it('throws with the missing key hash when a required signer is unwitnessed', () => {
    getUniqueSignerKeyHashes.mockReturnValue(new Set(['kh1', 'kh2']));
    let caught: unknown;
    try {
      assertTransactionFullySigned(txWithVkeys([['kh1', 'sig1']]), []);
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(TransactionUnderSignedError);
    expect((caught as TransactionUnderSignedError).missingKeyHashes).toEqual([
      'kh2',
    ]);
  });

  it('throws when the transaction has no vkey witnesses at all', () => {
    getUniqueSignerKeyHashes.mockReturnValue(new Set(['kh1']));
    expect(() => {
      assertTransactionFullySigned(txWithVkeys(undefined), []);
    }).toThrow(TransactionUnderSignedError);
  });
});
