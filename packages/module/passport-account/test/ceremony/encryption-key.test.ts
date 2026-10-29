import {
  AccAddress,
  GrantId,
  GrantScopeSalt,
  GrantSlot,
} from '@lace-contract/passport';
import {
  createPasskeySessionKeySource,
  PasskeyCeremonyCancelledError,
  PasskeyPrfUnsupportedError,
} from '@lace-lib/passkey';
import { HexBytes } from '@lace-lib/util';
import { x25519 } from '@noble/curves/ed25519.js';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { deviceEnvelopes } from '../../src/acc/envelopes';
import { openInboxEntry, sealInboxEntry } from '../../src/acc/inbox';
import { createPasskeyEncryptionKey } from '../../src/ceremony/encryption-key';
import { isLiveSecret, openGrantViewSeal } from '../acc/view-seal-reference';

import type { PasskeyEncryptionKey } from '../../src/ceremony/encryption-key';
import type { AccountKeyring } from '@lace-contract/passport';

const READER_SECRET_DOMAIN = 'lace-passport:reader:v1';
const NETWORK_ID = 'undeployed';
const DEVICE_PUBLIC_KEY = 'd1'.repeat(32);

const deviceOutput = () =>
  Uint8Array.from({ length: 32 }, (_, index) => index + 1);
const rootOutput = () =>
  Uint8Array.from({ length: 32 }, (_, index) => 255 - index);

const coin = {
  nonce: new Uint8Array(32).fill(1),
  color: new Uint8Array(32).fill(2),
  value: 9n,
};

const setup = () => {
  const get = vi.fn(async () => ({
    rawId: new Uint8Array(16).fill(0xa5).buffer,
    getClientExtensionResults: () => ({
      prf: { results: { first: deviceOutput(), second: rootOutput() } },
    }),
  }));
  const source = createPasskeySessionKeySource({
    rpId: 'localhost',
    credentials: { get } as unknown as CredentialsContainer,
  });
  return { get, source, encryptionKey: createPasskeyEncryptionKey(source) };
};

const createdKeyring = async (
  encryptionKey: PasskeyEncryptionKey,
): Promise<AccountKeyring> => {
  const created = await encryptionKey.createKeys(NETWORK_ID, {
    devicePublicKey: DEVICE_PUBLIC_KEY,
  });
  return {
    account: AccAddress('ac'.repeat(32)),
    encKey: created.encKey,
    envelopes: deviceEnvelopes(
      created.envelopes,
      await encryptionKey.readerPublicKey(NETWORK_ID),
    ),
  };
};

/** Every member of the key, called with harmless arguments. */
const everyMember = (
  encryptionKey: PasskeyEncryptionKey,
): (() => Promise<unknown>)[] => {
  const keyring: AccountKeyring = {
    account: AccAddress('ac'.repeat(32)),
    encKey: new Uint8Array(32),
    envelopes: [],
  };
  return [
    async () => encryptionKey.readerPublicKey(NETWORK_ID),
    async () =>
      encryptionKey.createKeys(NETWORK_ID, {
        devicePublicKey: DEVICE_PUBLIC_KEY,
      }),
    async () =>
      encryptionKey.sealToDevice(NETWORK_ID, keyring, {
        readerPublicKey: HexBytes.fromByteArray(
          x25519.getPublicKey(new Uint8Array(32).fill(3)),
        ),
        devicePublicKey: DEVICE_PUBLIC_KEY,
        epoch: 0n,
        counter: 0n,
      }),
    async () => encryptionKey.openInbox(NETWORK_ID, keyring, []),
    async () =>
      encryptionKey.sealGrant(NETWORK_ID, AccAddress('ac'.repeat(32)), {
        grantId: GrantId('ab'.repeat(32)),
        slot: GrantSlot(0),
        scopeSalt: GrantScopeSalt('cd'.repeat(32)),
        granteeScheme: 'jubjub-schnorr',
        granteePublicKey: 'ef'.repeat(32),
        object: {
          color: '00'.repeat(32),
          recipient: { kind: 'any' },
          maxCoinValue: '0',
        },
      }),
    async () =>
      encryptionKey.reencryptInbox(
        NETWORK_ID,
        { keyring, to: new Uint8Array(32) },
        [],
      ),
    async () =>
      encryptionKey.sealView(NETWORK_ID, keyring, {
        grantId: GrantId('ab'.repeat(32)),
        account: AccAddress('cd'.repeat(32)),
        readPublicKey: 'ef'.repeat(32),
      }),
    async () =>
      encryptionKey.holdsMaintenanceAuthority(NETWORK_ID, keyring, {
        tag: 'schnorr',
        value: 'a7'.repeat(32),
      }),
  ];
};

afterEach(() => vi.restoreAllMocks());

describe('createPasskeyEncryptionKey', () => {
  it('resolves the reader key of the reader secret the key source derives for the network', async () => {
    const { source, encryptionKey } = setup();
    const expected = x25519.getPublicKey(
      await source.deriveSecret({
        domain: READER_SECRET_DOMAIN,
        context: NETWORK_ID,
        length: 32,
      }),
    );

    await expect(encryptionKey.readerPublicKey(NETWORK_ID)).resolves.toEqual(
      expected,
    );
  });

  it('asks the key source for the reader secret under the reader domain with the network as context', async () => {
    const { source, encryptionKey } = setup();
    const deriveSecret = vi.spyOn(source, 'deriveSecret');

    await encryptionKey.readerPublicKey(NETWORK_ID);
    await encryptionKey.readerPublicKey('devnet');

    expect(deriveSecret).toHaveBeenNthCalledWith(1, {
      domain: READER_SECRET_DOMAIN,
      context: NETWORK_ID,
      length: 32,
    });
    expect(deriveSecret).toHaveBeenNthCalledWith(2, {
      domain: READER_SECRET_DOMAIN,
      context: 'devnet',
      length: 32,
    });
  });

  it('zeroes the reader secret once the call is over', async () => {
    const { source, encryptionKey } = setup();
    let secret: Uint8Array = new Uint8Array();
    const derive = source.deriveSecret;
    vi.spyOn(source, 'deriveSecret').mockImplementation(async params => {
      secret = await derive(params);
      return secret;
    });

    await encryptionKey.readerPublicKey(NETWORK_ID);

    expect(secret).toEqual(new Uint8Array(32));
  });

  it('maps cancellation and unsupported PRF onto Passport errors for every member, keeping the cause', async () => {
    const { source, encryptionKey } = setup();
    const deriveSecret = vi.spyOn(source, 'deriveSecret');
    for (const call of everyMember(encryptionKey)) {
      const cancelled = new PasskeyCeremonyCancelledError();
      const unsupported = new PasskeyPrfUnsupportedError();
      deriveSecret
        .mockRejectedValueOnce(cancelled)
        .mockRejectedValueOnce(unsupported);

      await expect(call()).rejects.toMatchObject({
        code: 'ceremony-cancelled',
        cause: cancelled,
      });
      await expect(call()).rejects.toMatchObject({
        code: 'prf-unsupported',
        cause: unsupported,
      });
    }
  });

  it('preserves unrelated errors', async () => {
    const { source, encryptionKey } = setup();
    const failure = new Error('security key unplugged');
    vi.spyOn(source, 'deriveSecret').mockRejectedValueOnce(failure);

    await expect(encryptionKey.readerPublicKey(NETWORK_ID)).rejects.toBe(
      failure,
    );
  });

  it('draws the account keys, opens, re-encrypts and seals a read grant in one session', async () => {
    const { get, source, encryptionKey } = setup();
    const readSecret = new Uint8Array(32).fill(0x77);
    const grantId = GrantId('ab'.repeat(32));
    const account = AccAddress('cd'.repeat(32));
    const next = x25519.utils.randomSecretKey();

    const { opened, moved, seal, keyring } = await source.withSession(
      async () => {
        const held = await createdKeyring(encryptionKey);
        const entry = await sealInboxEntry(held.encKey, coin);
        const [sealed] = await encryptionKey.reencryptInbox(
          NETWORK_ID,
          { keyring: held, to: x25519.getPublicKey(next) },
          [entry],
        );
        return {
          opened: await encryptionKey.openInbox(NETWORK_ID, held, [entry]),
          moved: await openInboxEntry(next, sealed!),
          seal: (
            await encryptionKey.sealView(NETWORK_ID, held, {
              grantId,
              account,
              readPublicKey: HexBytes.fromByteArray(
                x25519.getPublicKey(readSecret),
              ),
            })
          ).seal,
          keyring: held,
        };
      },
    );

    expect(opened).toEqual([{ kind: 'coin', coin }]);
    expect(moved).toEqual(coin);
    expect(
      isLiveSecret(
        await openGrantViewSeal(readSecret, seal, { grantId, account }),
        keyring.encKey,
      ),
    ).toBe(true);
    expect(get).toHaveBeenCalledOnce();
  });

  it('shares the open session while mnemonic access stays fresh', async () => {
    const { get, source, encryptionKey } = setup();

    await source.withSession(async () => {
      await encryptionKey.readerPublicKey(NETWORK_ID);
      await source.withPasskeyMnemonic(async () => undefined);
    });

    expect(get).toHaveBeenCalledTimes(2);
  });
});
