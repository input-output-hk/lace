import { ByteArray, HexBytes } from '@lace-lib/util';
import { x25519 } from '@noble/curves/ed25519.js';
import { describe, expect, it } from 'vitest';

import { GRANT_VIEW_SEAL_LENGTH, sealGrantView } from '../../src/acc/view-seal';

import { isLiveSecret, openGrantViewSeal } from './view-seal-reference';

import type { AccAddress, GrantId } from '@lace-contract/passport';

const hex = (value: string): Uint8Array => ByteArray.fromHex(HexBytes(value));

/** RFC 7748 section 6.1, Bob's key pair, as the grantee's read key. */
const READ_SECRET = hex(
  '5dab087e624a8a4b79e17f8b83800ee66f3bb1292618b6fd1c2f8b27ff88e0eb',
);
const READ_PUBLIC_KEY =
  'de9edb7d7b7dc1b4d35b61c2ece435373f8343c85b78674dadfc7e146f882b4f';

const GRANT_ID = '11'.repeat(32) as GrantId;
const OTHER_GRANT_ID = '12'.repeat(32) as GrantId;
const ACCOUNT = '22'.repeat(32) as AccAddress;
const OTHER_ACCOUNT = '23'.repeat(32) as AccAddress;
const ENC_SECRET = () => new Uint8Array(32).fill(0x33);

const binding = {
  grantId: GRANT_ID,
  account: ACCOUNT,
  readPublicKey: READ_PUBLIC_KEY,
};

const seal = async (overrides: Partial<typeof binding> = {}) =>
  sealGrantView(ENC_SECRET(), { ...binding, ...overrides });

describe('sealGrantView', () => {
  it('lays the container out as version, suite, ephemeral key, nonce, tag and ciphertext over 94 bytes', async () => {
    const sealed = await seal();

    expect(sealed).toHaveLength(GRANT_VIEW_SEAL_LENGTH);
    expect(sealed[0]).toBe(0x01);
    expect(sealed[1]).toBe(0x01);
    expect(sealed.slice(2, 34)).not.toEqual(new Uint8Array(32));
    expect(sealed.slice(34, 46)).not.toEqual(new Uint8Array(12));
    expect(sealed.slice(62)).not.toEqual(ENC_SECRET());
  });

  it('opens with an independent reader to the sealed secret, which passes the liveness check against its enc_key', async () => {
    const opened = await openGrantViewSeal(READ_SECRET, await seal(), binding);

    expect(opened).toEqual(ENC_SECRET());
    expect(isLiveSecret(opened, x25519.getPublicKey(ENC_SECRET()))).toBe(true);
    expect(
      isLiveSecret(opened, x25519.getPublicKey(new Uint8Array(32).fill(0x34))),
    ).toBe(false);
  });

  it('draws a fresh ephemeral key and nonce per seal', async () => {
    const [first, second] = await Promise.all([seal(), seal()]);

    expect(first.slice(2, 34)).not.toEqual(second.slice(2, 34));
    expect(first.slice(34, 46)).not.toEqual(second.slice(34, 46));
    await expect(
      openGrantViewSeal(READ_SECRET, second, binding),
    ).resolves.toEqual(ENC_SECRET());
  });

  it('opens for no other read key', async () => {
    await expect(
      openGrantViewSeal(new Uint8Array(32).fill(0x44), await seal(), binding),
    ).rejects.toThrow();
  });

  it('binds the grant id: a seal for one grant does not open under another', async () => {
    await expect(
      openGrantViewSeal(READ_SECRET, await seal(), {
        grantId: OTHER_GRANT_ID,
        account: ACCOUNT,
      }),
    ).rejects.toThrow();
    await expect(
      openGrantViewSeal(READ_SECRET, await seal({ grantId: OTHER_GRANT_ID }), {
        grantId: OTHER_GRANT_ID,
        account: ACCOUNT,
      }),
    ).resolves.toEqual(ENC_SECRET());
  });

  it('binds the account: a seal for one account does not open under another', async () => {
    await expect(
      openGrantViewSeal(READ_SECRET, await seal(), {
        grantId: GRANT_ID,
        account: OTHER_ACCOUNT,
      }),
    ).rejects.toThrow();
  });

  it.each(
    Array.from({ length: GRANT_VIEW_SEAL_LENGTH }, (_, offset) => offset),
  )('fails to open once byte %i is tampered with', async offset => {
    const sealed = await seal();
    sealed[offset] ^= 0x01;

    await expect(
      openGrantViewSeal(READ_SECRET, sealed, binding),
    ).rejects.toThrow();
  });

  it('fails to open when truncated or extended', async () => {
    const sealed = await seal();

    await expect(
      openGrantViewSeal(READ_SECRET, sealed.slice(0, 93), binding),
    ).rejects.toThrow('length');
    await expect(
      openGrantViewSeal(READ_SECRET, new Uint8Array([...sealed, 0]), binding),
    ).rejects.toThrow('length');
  });

  it('refuses a read key of small order, whose shared secret is all zero', async () => {
    await expect(seal({ readPublicKey: '00'.repeat(32) })).rejects.toThrow();
    await expect(
      seal({
        readPublicKey:
          'e0eb7a7c3b41b8ae1656e3faf19fc46ada098deb9c32b1fd866205165f49b800',
      }),
    ).rejects.toThrow();
  });

  it('refuses a secret of another length than 32 bytes', async () => {
    await expect(sealGrantView(new Uint8Array(31), binding)).rejects.toThrow(
      '32-byte secret',
    );
  });
});
