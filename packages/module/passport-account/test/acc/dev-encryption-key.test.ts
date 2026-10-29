import { AccAddress } from '@lace-contract/passport';
import { deriveSymmetricSecret } from '@lace-lib/crypto';
import { HexBytes } from '@lace-lib/util';
import { x25519 } from '@noble/curves/ed25519.js';
import { describe, expect, it } from 'vitest';

import { devEncryptionKey } from '../../src/acc/dev-encryption-key';
import { deviceEnvelopes, openDeviceEnvelope } from '../../src/acc/envelopes';
import { sealInboxEntry } from '../../src/acc/inbox';

const READER_SECRET_DOMAIN = 'lace-passport:reader:v1';
const SEED_LENGTH = 64;
const NETWORK_ID = 'undeployed';
const DEVICE_PUBLIC_KEY = 'd1'.repeat(32);

const fixedSeed = () => new Uint8Array(SEED_LENGTH).fill(1);

const readerSecret = (seed: Uint8Array, networkId = NETWORK_ID) =>
  deriveSymmetricSecret(seed, {
    domain: READER_SECRET_DOMAIN,
    context: networkId,
    length: 32,
  });

describe('devEncryptionKey', () => {
  it('rejects a seed of the wrong length', () => {
    expect(() => devEncryptionKey(new Uint8Array(32))).toThrow(
      'Dev encryption key seed must be 64 bytes, got 32',
    );
  });

  it('resolves the reader key of the MIP-0015 reader secret of the held seed on the network', async () => {
    await expect(
      devEncryptionKey(fixedSeed()).readerPublicKey(NETWORK_ID),
    ).resolves.toEqual(x25519.getPublicKey(readerSecret(fixedSeed())));
  });

  it('resolves the same reader key for the same seed and network, another for another network or seed', async () => {
    const first = await devEncryptionKey(fixedSeed()).readerPublicKey(
      NETWORK_ID,
    );

    await expect(
      devEncryptionKey(fixedSeed()).readerPublicKey(NETWORK_ID),
    ).resolves.toEqual(first);
    await expect(
      devEncryptionKey(fixedSeed()).readerPublicKey('devnet'),
    ).resolves.not.toEqual(first);
    await expect(
      devEncryptionKey(new Uint8Array(SEED_LENGTH).fill(2)).readerPublicKey(
        NETWORK_ID,
      ),
    ).resolves.not.toEqual(first);
  });

  it('generates a fresh seed when none is given', async () => {
    const first = await devEncryptionKey().readerPublicKey(NETWORK_ID);

    await expect(
      devEncryptionKey().readerPublicKey(NETWORK_ID),
    ).resolves.not.toEqual(first);
  });

  it('draws a random account secret, never one derived from the seed', async () => {
    const key = devEncryptionKey(fixedSeed());

    const first = await key.createKeys(NETWORK_ID, {
      devicePublicKey: DEVICE_PUBLIC_KEY,
    });
    const second = await devEncryptionKey(fixedSeed()).createKeys(NETWORK_ID, {
      devicePublicKey: DEVICE_PUBLIC_KEY,
    });

    expect(HexBytes.fromByteArray(first.encKey)).not.toBe(
      HexBytes.fromByteArray(second.encKey),
    );
    const opened = await openDeviceEnvelope(
      readerSecret(fixedSeed()),
      first.envelopes[0],
    );
    expect(opened && x25519.getPublicKey(opened.secret)).toEqual(first.encKey);
  });

  it('opens the coins sealed to the account key its envelope delivers', async () => {
    const key = devEncryptionKey(fixedSeed());
    const created = await key.createKeys(NETWORK_ID, {
      devicePublicKey: DEVICE_PUBLIC_KEY,
    });
    const coin = {
      nonce: new Uint8Array(32).fill(1),
      color: new Uint8Array(32).fill(2),
      value: 11n,
    };
    const entry = await sealInboxEntry(created.encKey, coin);

    await expect(
      key.openInbox(
        NETWORK_ID,
        {
          account: AccAddress('ac'.repeat(32)),
          encKey: created.encKey,
          envelopes: deviceEnvelopes(
            created.envelopes,
            await key.readerPublicKey(NETWORK_ID),
          ),
        },
        [entry],
      ),
    ).resolves.toEqual([{ kind: 'coin', coin }]);
  });
});
