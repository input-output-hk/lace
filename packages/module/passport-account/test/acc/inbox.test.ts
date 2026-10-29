import { ByteArray, HexBytes } from '@lace-lib/util';
import { x25519 } from '@noble/curves/ed25519.js';
import { describe, expect, it } from 'vitest';

import {
  INBOX_ENTRY_LENGTH,
  openInboxEntry,
  sealInboxEntry,
} from '../../src/acc/inbox';

import { AccountSim } from './account-sim';

import type { ShieldedCoin } from '@lace-contract/passport';

const hex = (value: string): Uint8Array => ByteArray.fromHex(HexBytes(value));

/** RFC 7748 section 6.1, Alice's key pair. */
const ALICE_SECRET = hex(
  '77076d0a7318a57d3c16c17251b26645df4c2f87ebc0992ab177fba51db92c2a',
);
const ALICE_PUBLIC = hex(
  '8520f0098930a754748b7ddcb43ef75a0dbf3a0d26381af4eba4a98eaa9b4e6a',
);
const UINT128_MAX = 2n ** 128n - 1n;

/**
 * Entries sealed towards Alice's key by the reference implementation of
 * the custody standard, with the coins they describe. The first carries
 * the largest value the layout admits, the second a small one.
 */
const UPSTREAM_VECTORS: { entry: string; coin: ShieldedCoin }[] = [
  {
    entry:
      '01012925265d5a6d69ab3f784ea400bac3e47dfc477151b1f3bbc3fd7c9a2bf72c47bbe2a61a9a7992110f1fd411f78901d62b905cc60f49d1935f59ba0e3c2277de4240bd45dac02c66152d429dc3f6a4bf0fd4bf7f222cd20061e0b7bf54e307b6d818bcb74eec39959fa871687094883977870d6884f8b07e4822fd34ea8c5d06cc5ba1310a0795eca1a4f5620000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
    coin: {
      nonce: hex('a1'.repeat(32)),
      color: hex('b2'.repeat(32)),
      value: UINT128_MAX,
    },
  },
  {
    entry:
      '0101053bcddc61a096d4815959814420b9b16ce8a9e43d6cb2974d83be597d1eda3a34530bd04c2f864c71c5b2a697c7a0d0ad88e11877e5d968602df96cecbe4c2d616b160a42709f85616b1a4d4cc147ec55b919dbf97d3ef95c4a8643eeab348d3c9f65f636d8985e601181debc9f5e51547cd0880f3878e90fbcf54af52b385d540ec40e9103e1f4f9a0a3290000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
    coin: {
      nonce: hex('01'.repeat(32)),
      color: hex('02'.repeat(32)),
      value: 7n,
    },
  },
];

const coin = (value = 5n): ShieldedCoin => ({
  nonce: crypto.getRandomValues(new Uint8Array(32)),
  color: crypto.getRandomValues(new Uint8Array(32)),
  value,
});

const keyPair = () => {
  const secretKey = x25519.utils.randomSecretKey();
  return { secretKey, publicKey: x25519.getPublicKey(secretKey) };
};

const withByteFlipped = (entry: Uint8Array, offset: number): Uint8Array => {
  const tampered = Uint8Array.from(entry);
  tampered[offset] ^= 0x01;
  return tampered;
};

describe('openInboxEntry', () => {
  it.each(UPSTREAM_VECTORS)(
    'opens an entry sealed by the reference implementation to its coin',
    async ({ entry, coin: expected }) => {
      await expect(openInboxEntry(ALICE_SECRET, hex(entry))).resolves.toEqual(
        expected,
      );
    },
  );

  it('opens an entry the contract stored after a permissionless deposit', async () => {
    const { secretKey, publicKey } = keyPair();
    const sim = await AccountSim.create({ encKey: publicKey });
    const deposited = coin(42n);

    await sim.deposit(deposited, await sealInboxEntry(publicKey, deposited));

    const ledger = sim.ledger();
    expect(ledger.inbox_count).toBe(1n);
    await expect(
      openInboxEntry(secretKey, ledger.inbox.lookup(0n)),
    ).resolves.toEqual(deposited);
  });

  it('returns null for an entry sealed towards another key', async () => {
    const { publicKey } = keyPair();
    const entry = await sealInboxEntry(publicKey, coin());

    await expect(openInboxEntry(ALICE_SECRET, entry)).resolves.toBeNull();
  });

  it.each([
    ['the version byte', 0],
    ['the suite byte', 1],
  ])('returns null for an entry with %s changed', async (_label, offset) => {
    const entry = withByteFlipped(hex(UPSTREAM_VECTORS[1].entry), offset);

    await expect(openInboxEntry(ALICE_SECRET, entry)).resolves.toBeNull();
  });

  it.each([
    ['the ephemeral key', 2],
    ['the nonce', 34],
    ['the tag', 46],
    ['the ciphertext', 62],
    ['the last ciphertext byte', 141],
  ])('returns null for an entry with %s tampered', async (_label, offset) => {
    const entry = withByteFlipped(hex(UPSTREAM_VECTORS[1].entry), offset);

    await expect(openInboxEntry(ALICE_SECRET, entry)).resolves.toBeNull();
  });

  it('ignores the padding, which readers must not depend on', async () => {
    const entry = withByteFlipped(hex(UPSTREAM_VECTORS[1].entry), 191);

    await expect(openInboxEntry(ALICE_SECRET, entry)).resolves.toEqual(
      UPSTREAM_VECTORS[1].coin,
    );
  });

  it.each([0, 191, 193])(
    'returns null for an entry of %i bytes',
    async length => {
      const entry = new Uint8Array(length);
      entry.set(hex(UPSTREAM_VECTORS[1].entry).subarray(0, length));

      await expect(openInboxEntry(ALICE_SECRET, entry)).resolves.toBeNull();
    },
  );

  it('returns null for an all-zero entry', async () => {
    await expect(
      openInboxEntry(ALICE_SECRET, new Uint8Array(INBOX_ENTRY_LENGTH)),
    ).resolves.toBeNull();
  });

  it('returns null rather than throwing on a secret of the wrong length', async () => {
    await expect(
      openInboxEntry(new Uint8Array(31), hex(UPSTREAM_VECTORS[1].entry)),
    ).resolves.toBeNull();
  });
});

describe('sealInboxEntry', () => {
  it('lays the entry out as InboxEntry v1 with zero padding', async () => {
    const entry = await sealInboxEntry(ALICE_PUBLIC, coin());

    expect(entry).toHaveLength(INBOX_ENTRY_LENGTH);
    expect(entry[0]).toBe(0x01);
    expect(entry[1]).toBe(0x01);
    expect(entry.subarray(142)).toEqual(new Uint8Array(50));
  });

  it('seals a coin the holder of the secret opens', async () => {
    const sealed = coin(UINT128_MAX);

    const entry = await sealInboxEntry(ALICE_PUBLIC, sealed);

    await expect(openInboxEntry(ALICE_SECRET, entry)).resolves.toEqual(sealed);
  });

  it('seals the same coin differently each time', async () => {
    const sealed = coin();

    const first = await sealInboxEntry(ALICE_PUBLIC, sealed);
    const second = await sealInboxEntry(ALICE_PUBLIC, sealed);

    expect(first).not.toEqual(second);
    expect(first.subarray(2, 34)).not.toEqual(second.subarray(2, 34));
  });

  it('refuses a value beyond 128 bits', async () => {
    await expect(
      sealInboxEntry(ALICE_PUBLIC, coin(UINT128_MAX + 1n)),
    ).rejects.toThrow('must fit an unsigned 128-bit integer');
  });

  it('refuses a negative value', async () => {
    await expect(sealInboxEntry(ALICE_PUBLIC, coin(-1n))).rejects.toThrow(
      'must fit an unsigned 128-bit integer',
    );
  });

  it.each([
    ['nonce', { ...coin(), nonce: new Uint8Array(31) }],
    ['colour', { ...coin(), color: new Uint8Array(33) }],
  ])('refuses a %s of the wrong length', async (_field, malformed) => {
    await expect(sealInboxEntry(ALICE_PUBLIC, malformed)).rejects.toThrow(
      'needs a 32-byte nonce and a 32-byte colour',
    );
  });
});
