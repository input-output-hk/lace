import { Cardano } from '@cardano-sdk/core';
import * as Crypto from '@cardano-sdk/crypto';
import { beforeAll, describe, expect, it } from 'vitest';

import {
  CURRENT_CUSTODY_CONTRACT_VERSION,
  CUSTODY_CREATOR_INDEX_GAP,
  CUSTODY_DEVICE_KEY_PATH,
  custodyDeviceAccountIndex,
  custodyDeviceFingerprint,
  deriveCustodyDeviceKey,
} from '../src';

const harden = (index: number): number => index + 0x80_00_00_00;

const ENTROPY = Buffer.from('00112233445566778899aabbccddeeff', 'hex');

describe('deriveCustodyDeviceKey', () => {
  let accountPrivateKey: Crypto.Bip32PrivateKey;
  let accountPublicKey: Crypto.Bip32PublicKeyHex;

  beforeAll(async () => {
    await Crypto.ready();
    const { purpose, coinType } = CUSTODY_DEVICE_KEY_PATH;
    const accountIndex = custodyDeviceAccountIndex(
      CURRENT_CUSTODY_CONTRACT_VERSION,
      Cardano.NetworkMagics.Preprod,
    );
    accountPrivateKey = Crypto.Bip32PrivateKey.fromBip39Entropy(
      ENTROPY,
      '',
    ).derive([harden(purpose), harden(coinType), harden(accountIndex)]);
    accountPublicKey = accountPrivateKey.toPublic().hex();
  });

  it("follows CIP-1854: m/1854'/1815'/a'/0/i", () => {
    expect(CUSTODY_DEVICE_KEY_PATH).toEqual({
      purpose: 1854,
      coinType: 1815,
      role: 0,
    });
    expect(CUSTODY_CREATOR_INDEX_GAP).toBe(20);
  });

  it('derives from the public key what the private key derives at the same path', async () => {
    for (const index of [0, 1, CUSTODY_CREATOR_INDEX_GAP - 1]) {
      const expected = accountPrivateKey
        .derive([0, index])
        .toRawKey()
        .toPublic();
      expect(await deriveCustodyDeviceKey(accountPublicKey, index)).toEqual({
        ok: true,
        value: {
          index,
          publicKey: expected.hex(),
          keyHash: expected.hash().hex(),
        },
      });
    }
  });

  it('pins the key hash of a fixed account key', async () => {
    const result = await deriveCustodyDeviceKey(accountPublicKey, 0);
    expect(result.ok && result.value.keyHash).toBe(
      '8e6a642c452ef75a38f325364c5d78b4c63c6246156453cac6baeb58',
    );
  });

  it('refuses an index that is negative, fractional or hardened', async () => {
    for (const index of [-1, 0.5, 0x80_00_00_00]) {
      expect(await deriveCustodyDeviceKey(accountPublicKey, index)).toEqual({
        ok: false,
        error: { code: 'invalid-device-index', index },
      });
    }
  });

  it('refuses an account key that is not a curve point', async () => {
    const notAPoint = Crypto.Bip32PublicKeyHex(
      `${'00'.repeat(31)}7f${'ab'.repeat(32)}`,
    );
    expect(await deriveCustodyDeviceKey(notAPoint, 0)).toEqual({
      ok: false,
      error: { code: 'invalid-account-public-key' },
    });
  });
});

describe('custodyDeviceAccountIndex', () => {
  it('separates Mainnet (account 0) from every testnet (account 1) for the pinned version', () => {
    expect(
      custodyDeviceAccountIndex(
        CURRENT_CUSTODY_CONTRACT_VERSION,
        Cardano.NetworkMagics.Mainnet,
      ),
    ).toBe(0);
    for (const networkMagic of [
      Cardano.NetworkMagics.Preprod,
      Cardano.NetworkMagics.Preview,
      42,
    ]) {
      expect(
        custodyDeviceAccountIndex(
          CURRENT_CUSTODY_CONTRACT_VERSION,
          networkMagic,
        ),
      ).toBe(1);
    }
  });

  it("reads a network's own index before the version default", () => {
    const separated = {
      ...CURRENT_CUSTODY_CONTRACT_VERSION,
      deviceAccountIndex: {
        default: 3,
        byNetworkMagic: { [Cardano.NetworkMagics.Mainnet]: 1 },
      },
    };
    expect(
      custodyDeviceAccountIndex(separated, Cardano.NetworkMagics.Mainnet),
    ).toBe(1);
    expect(
      custodyDeviceAccountIndex(separated, Cardano.NetworkMagics.Preprod),
    ).toBe(3);
  });
});

describe('custodyDeviceFingerprint', () => {
  it('shows the first and last 8 hex characters', () => {
    expect(
      custodyDeviceFingerprint(
        Crypto.Ed25519KeyHashHex(
          'f3e8af5d65692bc36c63988cba68d3aa85eedac6f0adc2e11c2d71c5',
        ),
      ),
    ).toBe('f3e8af5d…1c2d71c5');
  });
});
