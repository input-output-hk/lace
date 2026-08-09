import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getCardanoXpubViaDeepLink } from '../../src/mobile/cardano-xpub';

// Bip32PublicKeyHex requires exactly 128 hex characters (64 bytes).
const IDENTITY_XPUB = 'a'.repeat(128);
const ACCOUNT_XPUB = 'b'.repeat(128);
// Raw 32-byte key and chain code, as the v10 response splits them.
const RAW_KEY = 'c'.repeat(64);
const CHAIN_CODE = 'd'.repeat(64);

const hoisted = vi.hoisted(() => ({
  cardanoGetPublicKey: vi.fn(),
}));

vi.mock('../../src/mobile/trezor-connect-bridge', () => ({
  getTrezorConnect: async () => ({
    cardanoGetPublicKey: hoisted.cardanoGetPublicKey,
  }),
}));

/** What Suite returns over the deep link: extended key in `xpub`, raw in `publicKey`. */
const bundleResponse = (identityXpub = IDENTITY_XPUB) =>
  hoisted.cardanoGetPublicKey.mockResolvedValue({
    success: true,
    payload: [
      { publicKey: RAW_KEY, xpub: identityXpub },
      { publicKey: RAW_KEY, xpub: ACCOUNT_XPUB },
    ],
  });

const requestedBundle = () =>
  (
    hoisted.cardanoGetPublicKey.mock.calls[0][0] as {
      bundle: { path: string; derivationType?: number }[];
    }
  ).bundle;

const requestedPaths = () => requestedBundle().map(item => item.path);

const requestedDerivationTypes = () =>
  requestedBundle().map(item => item.derivationType);

describe('getCardanoXpubViaDeepLink', () => {
  beforeEach(() => {
    hoisted.cardanoGetPublicKey.mockReset();
    bundleResponse();
  });

  it('reads the extended key from `xpub` when the response splits it off', async () => {
    const { publicKey } = await getCardanoXpubViaDeepLink(3);

    expect(publicKey).toBe(ACCOUNT_XPUB);
  });

  it('reads the extended key from `publicKey` when the host back-fills it there', async () => {
    hoisted.cardanoGetPublicKey.mockResolvedValue({
      success: true,
      payload: [{ publicKey: IDENTITY_XPUB }, { publicKey: ACCOUNT_XPUB }],
    });

    const { publicKey } = await getCardanoXpubViaDeepLink(3);

    expect(publicKey).toBe(ACCOUNT_XPUB);
  });

  it('rebuilds the extended key from the node when neither field carries it', async () => {
    hoisted.cardanoGetPublicKey.mockResolvedValue({
      success: true,
      payload: Array.from({ length: 2 }, () => ({
        publicKey: RAW_KEY,
        node: { public_key: RAW_KEY, chain_code: CHAIN_CODE },
      })),
    });

    const { publicKey } = await getCardanoXpubViaDeepLink(3);

    expect(publicKey).toBe(`${RAW_KEY}${CHAIN_CODE}`);
  });

  it('throws with the observed field sizes when no field carries an extended key', async () => {
    hoisted.cardanoGetPublicKey.mockResolvedValue({
      success: true,
      payload: Array.from({ length: 2 }, () => ({ publicKey: RAW_KEY })),
    });

    await expect(getCardanoXpubViaDeepLink(3)).rejects.toThrow(
      'xpub: 0 hex chars, publicKey: 64, node: 0',
    );
  });

  it('throws when the bundle comes back collapsed to a single key', async () => {
    hoisted.cardanoGetPublicKey.mockResolvedValue({
      success: true,
      payload: [{ publicKey: RAW_KEY, xpub: ACCOUNT_XPUB }],
    });

    await expect(getCardanoXpubViaDeepLink(3)).rejects.toThrow(
      'Trezor returned 1 keys for a 2-path bundle',
    );
  });

  it('requests the identity path and the account path in one deep-link round-trip', async () => {
    await getCardanoXpubViaDeepLink(3);

    expect(hoisted.cardanoGetPublicKey).toHaveBeenCalledTimes(1);
    expect(requestedPaths()).toEqual(["m/1852'/1815'/0'", "m/1852'/1815'/3'"]);
  });

  it('derives the same seed identity regardless of which account is requested', async () => {
    const { seedIdentity: fromAccount0 } = await getCardanoXpubViaDeepLink(0);
    const { seedIdentity: fromAccount7 } = await getCardanoXpubViaDeepLink(7);

    expect(fromAccount0).toBe(fromAccount7);
  });

  it('derives a different seed identity for a different device seed', async () => {
    const { seedIdentity } = await getCardanoXpubViaDeepLink(0);

    bundleResponse('c'.repeat(128));
    const { seedIdentity: otherSeedIdentity } = await getCardanoXpubViaDeepLink(
      0,
    );

    expect(otherSeedIdentity).not.toBe(seedIdentity);
  });

  it('throws when Suite returns a failure response', async () => {
    hoisted.cardanoGetPublicKey.mockResolvedValue({
      success: false,
      payload: { error: 'User cancelled' },
    });

    await expect(getCardanoXpubViaDeepLink(0)).rejects.toThrow(
      'Trezor cardanoGetPublicKey failed: User cancelled',
    );
  });

  it('passes the numeric derivation type to Trezor on every bundle item', async () => {
    await getCardanoXpubViaDeepLink(0, 'ICARUS_TREZOR');

    expect(requestedDerivationTypes()).toEqual([2, 2]);
  });

  it('passes undefined derivationType to Trezor when derivationType is omitted', async () => {
    await getCardanoXpubViaDeepLink(0);

    expect(requestedDerivationTypes()).toEqual([undefined, undefined]);
  });
});
