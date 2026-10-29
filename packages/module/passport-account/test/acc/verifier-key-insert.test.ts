import { describe, expect, it } from 'vitest';

import { verifierKeyInsert } from '../../src/acc/verifier-key-insert';

import type { VerifierKeyInsertLedger } from '../../src/acc/verifier-key-insert';

class ContractOperationVersionedVerifierKey {
  public constructor(
    readonly version: 'v3' | 'v4',
    readonly rawVk: Uint8Array,
  ) {}
}

class VerifierKeyInsert {
  public constructor(
    readonly operation: Uint8Array | string,
    readonly vk: ContractOperationVersionedVerifierKey,
  ) {}
}

const ledger = {
  ContractOperationVersionedVerifierKey,
  VerifierKeyInsert,
} as unknown as VerifierKeyInsertLedger;

/** A verifier key as the pinned compiler emits it: the v7 header, then the key. */
const verifierKeyWithHeader = (header: string): Uint8Array =>
  new Uint8Array([...new TextEncoder().encode(header), 0xb5, 0x23, 0, 1, 2]);

describe('verifierKeyInsert', () => {
  it('wraps a v7 headed key under operation version v4 for the named operation', () => {
    const key = verifierKeyWithHeader('midnight:verifier-key[v7]:');

    const insert = verifierKeyInsert(ledger, 'issue_grant_with_jubjub', key);

    expect(insert).toBeInstanceOf(VerifierKeyInsert);
    expect(insert.operation).toBe('issue_grant_with_jubjub');
    expect(insert.vk).toBeInstanceOf(ContractOperationVersionedVerifierKey);
    expect(insert.vk.version).toBe('v4');
    expect(insert.vk.rawVk).toBe(key);
  });

  it('refuses a key under the v6 header the previous compiler line emitted', () => {
    expect(() =>
      verifierKeyInsert(
        ledger,
        'add_device_with_jubjub',
        verifierKeyWithHeader('midnight:verifier-key[v6]:'),
      ),
    ).toThrow(
      "The verifier key of 'add_device_with_jubjub' is not a midnight:verifier-key[v7]: key, got 'midnight:verifier-key[v6]:'",
    );
  });

  it('refuses bytes that carry no verifier key header at all', () => {
    expect(() =>
      verifierKeyInsert(ledger, 'deposit_shielded', new Uint8Array([1, 2, 3])),
    ).toThrow("The verifier key of 'deposit_shielded' is not a");
  });
});
