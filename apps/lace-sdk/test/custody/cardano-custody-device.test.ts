import { Cardano } from '@cardano-sdk/core';
import { Bip32PublicKeyHex, Ed25519KeyHashHex } from '@cardano-sdk/crypto';
import { RemoteSignerError } from '@lace-lib/passkey';
import { describe, expect, it, vi } from 'vitest';

import { RemoteSignerResultError } from '../../src/cardano-remote-signer-factory';
import {
  deriveCardanoCustodyDevice,
  exportCardanoCustodyEnrollment,
  parseCardanoCustodyEnrollment,
} from '../../src/custody/cardano-custody-device';
import {
  CardanoCustodyEnrollmentInvalidError,
  CardanoCustodyUnsupportedSignerError,
} from '../../src/custody/cardano-custody-errors';
import { requestCardanoCustodyDeviceKey } from '../../src/custody/request-cardano-custody-device-key';
import { PasskeyWalletMismatchError } from '../../src/passkey-wallet-mismatch-error';

import {
  DEVICE_0,
  DEVICE_1,
  localChannel,
  PREPROD,
  TESTNET_CUSTODY_XPUB,
  words,
} from './custody-fixtures';

import type { PasskeyKeySource } from '@lace-lib/passkey';

const PREPROD_MAGIC = Cardano.NetworkMagics.Preprod;

const keySourceOf = ({
  credential = { ...localChannel, recipeVersion: 'v1' },
}: {
  credential?: ReturnType<PasskeyKeySource['credentialRef']> | null;
} = {}): PasskeyKeySource => {
  const source: PasskeyKeySource = {
    ensureCredential: vi.fn(),
    credentialRef: vi.fn(() => credential ?? undefined),
    withPasskeyMnemonic: async use => use(words),
  };
  vi.spyOn(source, 'withPasskeyMnemonic');
  return source;
};

describe('deriveCardanoCustodyDevice', () => {
  it('derives the device key at an index with its fingerprint', async () => {
    await expect(
      deriveCardanoCustodyDevice(TESTNET_CUSTODY_XPUB, 1),
    ).resolves.toMatchObject({
      index: 1,
      keyHash: DEVICE_1,
      fingerprint: `${DEVICE_1.slice(0, 8)}…${DEVICE_1.slice(-8)}`,
    });
  });

  it.each([-1, 0x80_00_00_00, 1.5])('refuses index %s', async index => {
    await expect(
      deriveCardanoCustodyDevice(TESTNET_CUSTODY_XPUB, index),
    ).rejects.toBeInstanceOf(RangeError);
  });

  it('refuses a key that is not a BIP-32 public key', async () => {
    await expect(
      deriveCardanoCustodyDevice(Bip32PublicKeyHex(`02${'00'.repeat(63)}`), 0),
    ).rejects.toBeInstanceOf(TypeError);
  });
});

describe('requestCardanoCustodyDeviceKey', () => {
  it('derives the testnet CIP-1854 account key from one fresh assertion in local mode', async () => {
    const keySource = keySourceOf();

    const key = await requestCardanoCustodyDeviceKey({
      mode: 'local',
      keySource,
      chainId: PREPROD,
    });

    expect(key).toMatchObject({
      extendedAccountPublicKey: TESTNET_CUSTODY_XPUB,
      networkMagic: PREPROD_MAGIC,
      channel: localChannel,
      device: { index: 0, keyHash: DEVICE_0 },
    });
    expect(keySource.withPasskeyMnemonic).toHaveBeenCalledTimes(1);
  });

  it('derives a separate key on Mainnet', async () => {
    const key = await requestCardanoCustodyDeviceKey({
      mode: 'local',
      keySource: keySourceOf(),
      chainId: Cardano.ChainIds.Mainnet,
    });

    expect(key.extendedAccountPublicKey).not.toBe(TESTNET_CUSTODY_XPUB);
    expect(key.device.keyHash).not.toBe(DEVICE_0);
  });

  it('refuses a key source that names no credential after the assertion', async () => {
    await expect(
      requestCardanoCustodyDeviceKey({
        mode: 'local',
        keySource: keySourceOf({ credential: null }),
        chainId: PREPROD,
      }),
    ).rejects.toBeInstanceOf(PasskeyWalletMismatchError);
  });

  it('asks the hosted signer for the network key and binds the signer origin', async () => {
    const request = vi.fn(async () => ({
      extendedAccountPublicKey: TESTNET_CUSTODY_XPUB.toUpperCase(),
    }));

    const key = await requestCardanoCustodyDeviceKey({
      mode: 'hosted',
      signer: { request },
      signerUrl: 'https://signer.example/app?x=1',
      chainId: PREPROD,
    });

    expect(request).toHaveBeenCalledWith('cardano-custody-public-key', {
      chainId: { networkId: 0, networkMagic: PREPROD_MAGIC },
    });
    expect(key).toMatchObject({
      extendedAccountPublicKey: TESTNET_CUSTODY_XPUB,
      networkMagic: PREPROD_MAGIC,
      channel: { type: 'hosted', origin: 'https://signer.example' },
      device: { keyHash: DEVICE_0 },
    });
  });

  it.each([undefined, {}, { extendedAccountPublicKey: 'ab' }])(
    'refuses the hosted answer %j',
    async answer => {
      await expect(
        requestCardanoCustodyDeviceKey({
          mode: 'hosted',
          signer: { request: vi.fn(async () => answer) },
          signerUrl: 'https://signer.example',
          chainId: PREPROD,
        }),
      ).rejects.toBeInstanceOf(RemoteSignerResultError);
    },
  );

  it('reports a signer without custody support', async () => {
    await expect(
      requestCardanoCustodyDeviceKey({
        mode: 'hosted',
        signer: {
          request: vi.fn(async () => {
            throw new RemoteSignerError('unsupported-request', 'unknown kind');
          }),
        },
        signerUrl: 'https://signer.example',
        chainId: PREPROD,
      }),
    ).rejects.toBeInstanceOf(CardanoCustodyUnsupportedSignerError);
  });

  it('refuses a malformed signer URL before asking the signer', async () => {
    const request = vi.fn();

    await expect(
      requestCardanoCustodyDeviceKey({
        mode: 'hosted',
        signer: { request },
        signerUrl: 'not a url',
        chainId: PREPROD,
      }),
    ).rejects.toBeInstanceOf(TypeError);
    expect(request).not.toHaveBeenCalled();
  });
});

describe('device enrollment', () => {
  const enrollment = exportCardanoCustodyEnrollment({
    networkMagic: PREPROD_MAGIC,
    device: { keyHash: Ed25519KeyHashHex(DEVICE_1.toUpperCase()) },
  });

  it('exports the key hash, network and fingerprint', () => {
    expect(enrollment).toEqual({
      type: 'cardano-custody-enrollment',
      version: 1,
      networkMagic: PREPROD_MAGIC,
      deviceKeyHash: DEVICE_1,
      fingerprint: `${DEVICE_1.slice(0, 8)}…${DEVICE_1.slice(-8)}`,
    });
  });

  it('round-trips through JSON', () => {
    expect(
      parseCardanoCustodyEnrollment(JSON.stringify(enrollment), {
        networkMagic: PREPROD_MAGIC,
      }),
    ).toEqual(enrollment);
  });

  it('refuses to export a key hash that is not 28 bytes', () => {
    expect(() =>
      exportCardanoCustodyEnrollment({
        networkMagic: PREPROD_MAGIC,
        device: { keyHash: 'ab'.repeat(27) as Ed25519KeyHashHex },
      }),
    ).toThrow(CardanoCustodyEnrollmentInvalidError);
  });

  const { fingerprint: _, ...withoutFingerprint } = enrollment;

  it.each([
    ['text that is not JSON', '{', undefined],
    ['an array', [], undefined],
    ['an extra field', { ...enrollment, extra: 1 }, undefined],
    ['a missing field', withoutFingerprint, undefined],
    ['another type', { ...enrollment, type: 'other' }, 'type'],
    ['another version', { ...enrollment, version: 2 }, 'version'],
    [
      'an upper-case key hash',
      { ...enrollment, deviceKeyHash: DEVICE_1.toUpperCase() },
      'deviceKeyHash',
    ],
    [
      'a substituted key hash',
      { ...enrollment, deviceKeyHash: DEVICE_0 },
      'fingerprint',
    ],
    [
      'another network',
      { ...enrollment, networkMagic: Cardano.NetworkMagics.Preview },
      'networkMagic',
    ],
  ])('refuses %s', (_name, input, field) => {
    let refusal: unknown;
    try {
      parseCardanoCustodyEnrollment(input, { networkMagic: PREPROD_MAGIC });
    } catch (error) {
      refusal = error;
    }
    expect(refusal).toBeInstanceOf(CardanoCustodyEnrollmentInvalidError);
    expect((refusal as CardanoCustodyEnrollmentInvalidError).field).toBe(field);
  });
});
