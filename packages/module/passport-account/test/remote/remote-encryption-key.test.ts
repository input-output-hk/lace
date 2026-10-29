import {
  EncryptionKeyMismatchError,
  GrantId,
  MaintenanceAuthorityMismatchError,
  GrantScopeSalt,
  GrantSlot,
  PrfUnsupportedError,
} from '@lace-contract/passport';
import { RemoteSignerError } from '@lace-lib/passkey';
import { describe, expect, it, vi } from 'vitest';

import { MAX_INBOX_ENTRIES_PER_REQUEST } from '../../src/acc/inbox';
import { MalformedPayloadError } from '../../src/remote/codec';
import { createRemoteEncryptionKey } from '../../src/remote/remote-encryption-key';

import type {
  AccAddress,
  AccountKeyring,
  GrantBookkeeping,
} from '@lace-contract/passport';

const PUBLIC_KEY = Uint8Array.from({ length: 32 }, (_, index) => 255 - index);
const PUBLIC_KEY_HEX = [...PUBLIC_KEY]
  .map(byte => byte.toString(16).padStart(2, '0'))
  .join('');
const ACCOUNT = 'ac'.repeat(32) as AccAddress;
const keyring: AccountKeyring = {
  account: ACCOUNT,
  encKey: new Uint8Array(32).fill(7),
  envelopes: [new Uint8Array(192).fill(0xd1)],
};
const encodedKeyring = {
  account: ACCOUNT,
  encKey: '07'.repeat(32),
  envelopes: ['d1'.repeat(192)],
};
const reader = {
  readerPublicKey: '12'.repeat(32),
  devicePublicKey: '34'.repeat(32),
};
const liveReader = { ...reader, epoch: 0n, counter: 3n };
const encodedLiveReader = { ...reader, epoch: '0', counter: '3' };
const coin = { nonce: '03'.repeat(32), color: '04'.repeat(32), value: '5' };
const openedCoin = {
  kind: 'coin',
  coin: {
    nonce: new Uint8Array(32).fill(3),
    color: new Uint8Array(32).fill(4),
    value: 5n,
  },
};
const hexOf = (entry: Uint8Array): string =>
  [...entry].map(byte => byte.toString(16).padStart(2, '0')).join('');

describe('createRemoteEncryptionKey', () => {
  it('requests the reader public key for the network and decodes it from hex', async () => {
    const client = { request: vi.fn(async () => PUBLIC_KEY_HEX) };

    await expect(
      createRemoteEncryptionKey(client).readerPublicKey('undeployed'),
    ).resolves.toEqual(PUBLIC_KEY);
    expect(client.request).toHaveBeenCalledExactlyOnceWith(
      'reader-public-key',
      { networkId: 'undeployed' },
    );
  });

  it.each(['not hex', PUBLIC_KEY_HEX.slice(2)])(
    'refuses a reader public key that is not 32 bytes of hex: %s',
    async answer => {
      const encryptionKey = createRemoteEncryptionKey({
        request: vi.fn(async () => answer),
      });

      await expect(encryptionKey.readerPublicKey('undeployed')).rejects.toThrow(
        new MalformedPayloadError('readerPublicKey'),
      );
    },
  );

  it('asks for fresh account keys with only the fields given, and decodes them', async () => {
    const client = {
      request: vi.fn(async () => ({
        encKey: '09'.repeat(32),
        envelopes: ['d1'.repeat(192)],
        registrations: [],
        authority: { tag: 'schnorr', value: 'a7'.repeat(32) },
      })),
    };
    const encryptionKey = createRemoteEncryptionKey(client);

    await expect(
      encryptionKey.createKeys('undeployed', {
        devicePublicKey: '34'.repeat(32),
      }),
    ).resolves.toEqual({
      encKey: new Uint8Array(32).fill(9),
      envelopes: [new Uint8Array(192).fill(0xd1)],
      registrations: [],
      authority: { tag: 'schnorr', value: 'a7'.repeat(32) },
    });
    await encryptionKey.createKeys('undeployed', {
      devicePublicKey: '34'.repeat(32),
      keyring,
      registrations: [new Uint8Array(192).fill(0xd2)],
      readers: [liveReader],
      rotateRoster: true,
      removed: { devicePublicKey: '56'.repeat(32), epoch: 0n, counter: 2n },
    });

    expect(client.request.mock.calls).toEqual([
      [
        'create-keys',
        { networkId: 'undeployed', devicePublicKey: '34'.repeat(32) },
      ],
      [
        'create-keys',
        {
          networkId: 'undeployed',
          devicePublicKey: '34'.repeat(32),
          keyring: encodedKeyring,
          registrations: ['d2'.repeat(192)],
          readers: [encodedLiveReader],
          rotateRoster: true,
          removed: {
            devicePublicKey: '56'.repeat(32),
            epoch: '0',
            counter: '2',
          },
        },
      ],
    ]);
  });

  it('refuses account keys the signer answers malformed', async () => {
    const encryptionKey = createRemoteEncryptionKey({
      request: vi.fn(async () => ({ encKey: '09'.repeat(32), envelopes: [] })),
    });

    await expect(
      encryptionKey.createKeys('undeployed', {
        devicePublicKey: '34'.repeat(32),
      }),
    ).rejects.toThrow(new MalformedPayloadError('keys.registrations'));
  });

  it('asks the signer to seal the live keys to a joining device and decodes the delivery', async () => {
    const client = {
      request: vi.fn(async () => ({
        envelope: 'd1'.repeat(192),
        registration: 'd2'.repeat(192),
      })),
    };

    await expect(
      createRemoteEncryptionKey(client).sealToDevice(
        'undeployed',
        keyring,
        liveReader,
      ),
    ).resolves.toEqual({
      envelope: new Uint8Array(192).fill(0xd1),
      registration: new Uint8Array(192).fill(0xd2),
    });
    expect(client.request).toHaveBeenCalledExactlyOnceWith('seal-to-device', {
      networkId: 'undeployed',
      keyring: encodedKeyring,
      reader: encodedLiveReader,
    });
  });

  it('sends the entries to open as hex with the keyring and decodes what the signer opened', async () => {
    const entries = [new Uint8Array(192).fill(1), new Uint8Array(192).fill(2)];
    const client = {
      request: vi.fn(async () => [
        { kind: 'coin', coin },
        { kind: 'device', device: reader },
      ]),
    };

    await expect(
      createRemoteEncryptionKey(client).openInbox(
        'undeployed',
        keyring,
        entries,
      ),
    ).resolves.toEqual([openedCoin, { kind: 'device', device: reader }]);
    expect(client.request).toHaveBeenCalledExactlyOnceWith('open-inbox', {
      networkId: 'undeployed',
      keyring: encodedKeyring,
      entries: ['01'.repeat(192), '02'.repeat(192)],
    });
  });

  it('opens an inbox larger than one request in consecutive batches of the shared maximum, each with the keyring, items kept in order', async () => {
    const entries = Array.from(
      { length: MAX_INBOX_ENTRIES_PER_REQUEST + 2 },
      (_, index) => new Uint8Array(192).fill(index % 2),
    );
    const sentEntries = (payload: unknown): string[] =>
      (payload as { entries: string[] }).entries;
    const client = {
      request: vi.fn(async (_kind: string, payload: unknown) =>
        sentEntries(payload).map(entry =>
          entry.startsWith('01') ? { kind: 'coin', coin } : null,
        ),
      ),
    };

    const opened = await createRemoteEncryptionKey(client).openInbox(
      'undeployed',
      keyring,
      entries,
    );

    expect(
      client.request.mock.calls.map(([, payload]) => [
        (payload as { keyring: unknown }).keyring,
        sentEntries(payload),
      ]),
    ).toEqual([
      [
        encodedKeyring,
        entries
          .slice(0, MAX_INBOX_ENTRIES_PER_REQUEST)
          .map(entry => hexOf(entry)),
      ],
      [encodedKeyring, ['00'.repeat(192), '01'.repeat(192)]],
    ]);
    expect(opened).toHaveLength(MAX_INBOX_ENTRIES_PER_REQUEST + 2);
    expect(opened.at(-2)).toBeNull();
    expect(opened.at(-1)).toEqual(openedCoin);
  });

  it('sends no request for an empty inbox', async () => {
    const client = { request: vi.fn(async () => []) };

    await expect(
      createRemoteEncryptionKey(client).openInbox('undeployed', keyring, []),
    ).resolves.toEqual([]);
    expect(client.request).not.toHaveBeenCalled();
  });

  it('refuses an answer that does not carry one item per entry sent', async () => {
    const encryptionKey = createRemoteEncryptionKey({
      request: vi.fn(async () => [null]),
    });

    await expect(
      encryptionKey.openInbox('undeployed', keyring, [
        new Uint8Array(192),
        new Uint8Array(192),
      ]),
    ).rejects.toThrow(new MalformedPayloadError('opened'));
  });

  it('refuses an opened coin the signer answers malformed', async () => {
    const encryptionKey = createRemoteEncryptionKey({
      request: vi.fn(async () => [
        { kind: 'coin', coin: { ...coin, nonce: 'aa' } },
      ]),
    });

    await expect(
      encryptionKey.openInbox('undeployed', keyring, [new Uint8Array(192)]),
    ).rejects.toThrow(new MalformedPayloadError('opened[0].coin.nonce'));
  });

  it('asks the signer to seal a grant bookkeeping and decodes the grant records', async () => {
    const grant: GrantBookkeeping = {
      grantId: GrantId('ab'.repeat(32)),
      slot: GrantSlot(0),
      scopeSalt: GrantScopeSalt('cd'.repeat(32)),
      granteeScheme: 'jubjub-schnorr',
      granteePublicKey: 'ef'.repeat(32),
      object: {
        color: '00'.repeat(32),
        recipient: { kind: 'any' },
        maxCoinValue: '5',
      },
    };
    const client = {
      request: vi.fn(async () => ['d3'.repeat(192), 'd3'.repeat(192)]),
    };

    await expect(
      createRemoteEncryptionKey(client).sealGrant('undeployed', ACCOUNT, grant),
    ).resolves.toEqual([
      new Uint8Array(192).fill(0xd3),
      new Uint8Array(192).fill(0xd3),
    ]);
    expect(client.request).toHaveBeenCalledExactlyOnceWith('seal-grant', {
      networkId: 'undeployed',
      account: ACCOUNT,
      grant,
    });
  });

  it('sends the entries to re-encrypt with the keyring and the target key, and decodes the fresh entries, null kept', async () => {
    const client = {
      request: vi.fn(async () => ['05'.repeat(192), null]),
    };

    await expect(
      createRemoteEncryptionKey(client).reencryptInbox(
        'undeployed',
        { keyring, to: new Uint8Array(32).fill(9) },
        [new Uint8Array(192).fill(1), new Uint8Array(192).fill(2)],
      ),
    ).resolves.toEqual([new Uint8Array(192).fill(5), null]);
    expect(client.request).toHaveBeenCalledExactlyOnceWith('reencrypt-inbox', {
      networkId: 'undeployed',
      keyring: encodedKeyring,
      to: '09'.repeat(32),
      entries: ['01'.repeat(192), '02'.repeat(192)],
    });
  });

  it('re-encrypts an inbox larger than one request in consecutive batches towards the same key, and sends nothing for none', async () => {
    const entries = Array.from(
      { length: MAX_INBOX_ENTRIES_PER_REQUEST + 2 },
      (_, index) => new Uint8Array(192).fill(index % 2 === 0 ? 1 : 2),
    );
    const sentEntries = (payload: unknown): string[] =>
      (payload as { entries: string[] }).entries;
    const client = {
      request: vi.fn(async (_kind: string, payload: unknown) =>
        sentEntries(payload).map(entry =>
          entry.startsWith('01') ? '05'.repeat(192) : null,
        ),
      ),
    };
    const encryptionKey = createRemoteEncryptionKey(client);
    const rotation = { keyring, to: new Uint8Array(32).fill(9) };

    const moved = await encryptionKey.reencryptInbox(
      'undeployed',
      rotation,
      entries,
    );
    await expect(
      encryptionKey.reencryptInbox('undeployed', rotation, []),
    ).resolves.toEqual([]);

    expect(
      client.request.mock.calls.map(([kind, payload]) => [
        kind,
        (payload as { to: string }).to,
        sentEntries(payload).length,
      ]),
    ).toEqual([
      ['reencrypt-inbox', '09'.repeat(32), MAX_INBOX_ENTRIES_PER_REQUEST],
      ['reencrypt-inbox', '09'.repeat(32), 2],
    ]);
    expect(moved).toHaveLength(MAX_INBOX_ENTRIES_PER_REQUEST + 2);
    expect(moved.at(-2)).toEqual(new Uint8Array(192).fill(5));
    expect(moved.at(-1)).toBeNull();
  });

  it.each<[string, unknown]>([
    ['entries', ['05'.repeat(192)]],
    ['entries[0]', ['05'.repeat(191), null]],
  ])(
    'refuses a re-encryption answer whose %s cannot be read',
    async (field, answer) => {
      const encryptionKey = createRemoteEncryptionKey({
        request: vi.fn(async () => answer),
      });

      await expect(
        encryptionKey.reencryptInbox(
          'undeployed',
          { keyring, to: new Uint8Array(32) },
          [new Uint8Array(192), new Uint8Array(192)],
        ),
      ).rejects.toThrow(new MalformedPayloadError(field));
    },
  );

  it('requests the seal of the live secret towards a read key and decodes the seal and its grant record', async () => {
    const client = {
      request: vi.fn(async () => ({
        seal: '06'.repeat(94),
        entry: 'd3'.repeat(192),
      })),
    };
    const request = {
      grantId: 'ab'.repeat(32) as GrantId,
      account: 'cd'.repeat(32) as AccAddress,
      readPublicKey: 'ef'.repeat(32),
    };

    await expect(
      createRemoteEncryptionKey(client).sealView(
        'undeployed',
        keyring,
        request,
      ),
    ).resolves.toEqual({
      seal: new Uint8Array(94).fill(6),
      entry: new Uint8Array(192).fill(0xd3),
    });
    expect(client.request).toHaveBeenCalledExactlyOnceWith('seal-view', {
      networkId: 'undeployed',
      keyring: encodedKeyring,
      ...request,
    });
  });

  it('refuses a seal of another length than 94 bytes', async () => {
    const encryptionKey = createRemoteEncryptionKey({
      request: vi.fn(async () => ({
        seal: '06'.repeat(93),
        entry: 'd3'.repeat(192),
      })),
    });

    await expect(
      encryptionKey.sealView('undeployed', keyring, {
        grantId: 'ab'.repeat(32) as GrantId,
        account: 'cd'.repeat(32) as AccAddress,
        readPublicKey: 'ef'.repeat(32),
      }),
    ).rejects.toThrow(new MalformedPayloadError('view.seal'));
  });

  it.each([
    ['prf-unsupported', PrfUnsupportedError],
    ['encryption-key-mismatch', EncryptionKeyMismatchError],
  ])(
    'maps the %s failure onto its Passport error',
    async (code, errorClass) => {
      const encryptionKey = createRemoteEncryptionKey({
        request: vi.fn(async () => {
          throw new RemoteSignerError(code, 'no');
        }),
      });

      await expect(
        encryptionKey.openInbox('undeployed', keyring, [new Uint8Array(192)]),
      ).rejects.toBeInstanceOf(errorClass);
    },
  );
  describe('signMaintenanceUpdate', () => {
    const authority = { tag: 'schnorr' as const, value: 'a7'.repeat(32) };
    const signature = { tag: 'schnorr' as const, value: '5e'.repeat(64) };
    const request = {
      keyring,
      authority,
      counter: 4n,
      changes: {
        kind: 'insert-verifier-keys' as const,
        inserts: [
          { operation: 'withdraw_unshielded', verifierKey: Uint8Array.of(1) },
        ],
      },
    };

    it('asks the signer to sign the update the request names and decodes what it signed', async () => {
      const client = {
        request: vi.fn(async () => ({ signature, authority })),
      };

      await expect(
        createRemoteEncryptionKey(client).signMaintenanceUpdate(
          'undeployed',
          request,
        ),
      ).resolves.toEqual({ signature, authority });
      expect(client.request).toHaveBeenCalledExactlyOnceWith(
        'sign-maintenance-update',
        {
          networkId: 'undeployed',
          keyring: encodedKeyring,
          authority,
          counter: '4',
          changes: {
            kind: 'insert-verifier-keys',
            inserts: [{ operation: 'withdraw_unshielded', verifierKey: '01' }],
          },
        },
      );
    });

    it('rejects with MaintenanceAuthorityMismatchError when no envelope sent holds the authority', async () => {
      const client = { request: vi.fn(async () => null) };

      await expect(
        createRemoteEncryptionKey(client).signMaintenanceUpdate(
          'undeployed',
          request,
        ),
      ).rejects.toBeInstanceOf(MaintenanceAuthorityMismatchError);
      expect(client.request).toHaveBeenCalledOnce();
    });

    it('refuses a signature the signer answers malformed', async () => {
      const client = {
        request: vi.fn(async () => ({
          signature: { tag: 'rsa', value: '5e' },
        })),
      };

      await expect(
        createRemoteEncryptionKey(client).signMaintenanceUpdate(
          'undeployed',
          request,
        ),
      ).rejects.toThrow(new MalformedPayloadError('signed.signature.tag'));
    });
  });

  describe('holdsMaintenanceAuthority', () => {
    const authority = { tag: 'schnorr' as const, value: 'a7'.repeat(32) };

    it.each([true, false])(
      'asks the signer whether the keyring holds the authority and answers %s',
      async holds => {
        const client = { request: vi.fn(async () => holds) };

        await expect(
          createRemoteEncryptionKey(client).holdsMaintenanceAuthority(
            'undeployed',
            keyring,
            authority,
          ),
        ).resolves.toBe(holds);
        expect(client.request).toHaveBeenCalledExactlyOnceWith(
          'holds-maintenance-authority',
          { networkId: 'undeployed', keyring: encodedKeyring, authority },
        );
      },
    );

    it.each([null, 'true', 1, {}])(
      'refuses an answer that is not a boolean: %s',
      async answer => {
        const client = { request: vi.fn(async () => answer) };

        await expect(
          createRemoteEncryptionKey(client).holdsMaintenanceAuthority(
            'undeployed',
            keyring,
            authority,
          ),
        ).rejects.toThrow(new MalformedPayloadError('holds'));
      },
    );
  });

  describe('with more envelopes than one keyring carries', () => {
    const envelopeAt = (position: number): Uint8Array => {
      const envelope = new Uint8Array(192).fill(0xd1);
      envelope[2] = position % 256;
      envelope[3] = Math.floor(position / 256);
      return envelope;
    };
    const flooded: AccountKeyring = {
      ...keyring,
      envelopes: Array.from(
        { length: MAX_INBOX_ENTRIES_PER_REQUEST * 2 + 3 },
        (_, position) => envelopeAt(position),
      ),
    };
    const sentEnvelopes = (payload: unknown): string[] =>
      (payload as { keyring: { envelopes: string[] } }).keyring.envelopes;

    /** A signer that finds the live envelope at `live`, answering each page by its position there. */
    const signerFinding = (live: number | undefined) => ({
      request: vi.fn(async (kind: string, payload: unknown) => {
        if (kind !== 'find-live-envelope') return [null];
        const page = sentEnvelopes(payload);
        const position = page.indexOf(hexOf(envelopeAt(live ?? -1)));
        return live === undefined || position === -1 ? null : position;
      }),
    });

    it('pages the envelopes to the signer oldest page first, each within one request, and opens with the keyring from the live envelope on', async () => {
      const client = signerFinding(1);
      const encryptionKey = createRemoteEncryptionKey(client);

      await encryptionKey.openInbox('undeployed', flooded, [
        new Uint8Array(192),
      ]);

      const pages = client.request.mock.calls
        .filter(([kind]) => kind === 'find-live-envelope')
        .map(([, payload]) => sentEnvelopes(payload));
      const hexes = flooded.envelopes.map(envelope => hexOf(envelope));
      expect(pages).toEqual([
        hexes.slice(MAX_INBOX_ENTRIES_PER_REQUEST + 3),
        hexes.slice(3, MAX_INBOX_ENTRIES_PER_REQUEST + 3),
        hexes.slice(0, 3),
      ]);
      const [, opened] = client.request.mock.calls.find(
        ([kind]) => kind === 'open-inbox',
      )!;
      expect(sentEnvelopes(opened)).toEqual(
        hexes.slice(1, MAX_INBOX_ENTRIES_PER_REQUEST + 1),
      );
    });

    it('stops at the oldest page holding the live envelope and finds it once per keyring', async () => {
      const live = MAX_INBOX_ENTRIES_PER_REQUEST * 2;
      const client = signerFinding(live);
      const encryptionKey = createRemoteEncryptionKey(client);

      await encryptionKey.openInbox('undeployed', flooded, [
        new Uint8Array(192),
      ]);
      await encryptionKey.reencryptInbox(
        'undeployed',
        { keyring: flooded, to: new Uint8Array(32).fill(9) },
        [new Uint8Array(192)],
      );

      expect(
        client.request.mock.calls.map(([kind, payload]) => [
          kind,
          sentEnvelopes(payload).length,
        ]),
      ).toEqual([
        ['find-live-envelope', MAX_INBOX_ENTRIES_PER_REQUEST],
        ['open-inbox', 3],
        ['reencrypt-inbox', 3],
      ]);
    });

    it('rejects with EncryptionKeyMismatchError when no page holds the live envelope, opening nothing', async () => {
      const client = signerFinding(undefined);

      await expect(
        createRemoteEncryptionKey(client).openInbox('undeployed', flooded, [
          new Uint8Array(192),
        ]),
      ).rejects.toBeInstanceOf(EncryptionKeyMismatchError);
      expect(client.request.mock.calls.map(([kind]) => kind)).toEqual([
        'find-live-envelope',
        'find-live-envelope',
        'find-live-envelope',
      ]);
    });

    /**
     * A signer that finds the live envelope at `live` and signs only over
     * a keyring holding the envelope at `signer`.
     */
    const signerSigningWith = (live: number, signer: number | undefined) => ({
      request: vi.fn(async (kind: string, payload: unknown) => {
        const sent = sentEnvelopes(payload);
        if (kind === 'find-live-envelope') {
          const position = sent.indexOf(hexOf(envelopeAt(live)));
          return position === -1 ? null : position;
        }
        return signer !== undefined && sent.includes(hexOf(envelopeAt(signer)))
          ? { signature: { tag: 'schnorr', value: '5e'.repeat(64) } }
          : null;
      }),
    });
    const maintenance = {
      keyring: flooded,
      authority: { tag: 'schnorr' as const, value: 'a7'.repeat(32) },
      counter: 2n,
      changes: {
        kind: 'replace-authority' as const,
        authority: { tag: 'schnorr' as const, value: 'b8'.repeat(32) },
      },
    };
    const signingPages = (client: ReturnType<typeof signerSigningWith>) =>
      client.request.mock.calls
        .filter(([kind]) => kind === 'sign-maintenance-update')
        .map(([, payload]) => sentEnvelopes(payload));

    it('signs over the live envelope beside each run of the older ones in turn, each within one request, until one holds the authority', async () => {
      const client = signerSigningWith(1, flooded.envelopes.length - 1);

      await expect(
        createRemoteEncryptionKey(client).signMaintenanceUpdate(
          'undeployed',
          maintenance,
        ),
      ).resolves.toEqual({
        signature: { tag: 'schnorr', value: '5e'.repeat(64) },
      });

      const hexes = flooded.envelopes.map(envelope => hexOf(envelope));
      const run = MAX_INBOX_ENTRIES_PER_REQUEST - 1;
      expect(signingPages(client)).toEqual([
        [hexes[1], ...hexes.slice(2, 2 + run)],
        [hexes[1], ...hexes.slice(2 + run, 2 + run * 2)],
        [hexes[1], ...hexes.slice(2 + run * 2)],
      ]);
    });

    it('stops at the first keyring holding the authority', async () => {
      const client = signerSigningWith(1, 2);

      await createRemoteEncryptionKey(client).signMaintenanceUpdate(
        'undeployed',
        maintenance,
      );

      expect(signingPages(client)).toHaveLength(1);
    });

    it('rejects with MaintenanceAuthorityMismatchError once no older envelope holds the authority, never sending a newer one', async () => {
      const client = signerSigningWith(3, undefined);

      await expect(
        createRemoteEncryptionKey(client).signMaintenanceUpdate(
          'undeployed',
          maintenance,
        ),
      ).rejects.toBeInstanceOf(MaintenanceAuthorityMismatchError);
      const hexes = flooded.envelopes.map(envelope => hexOf(envelope));
      const pages = signingPages(client);
      expect(pages.flat()).not.toContain(hexes[0]);
      expect(new Set(pages.flat())).toEqual(new Set(hexes.slice(3)));
      expect(
        pages.every(
          page =>
            page[0] === hexes[3] &&
            page.length <= MAX_INBOX_ENTRIES_PER_REQUEST,
        ),
      ).toBe(true);
    });

    it('signs over the live envelope alone when it is the oldest', async () => {
      const live = flooded.envelopes.length - 1;
      const client = signerSigningWith(live, undefined);

      await expect(
        createRemoteEncryptionKey(client).signMaintenanceUpdate(
          'undeployed',
          maintenance,
        ),
      ).rejects.toBeInstanceOf(MaintenanceAuthorityMismatchError);
      expect(signingPages(client)).toEqual([[hexOf(envelopeAt(live))]]);
    });

    /**
     * A signer that finds the live envelope at `live` and answers that a
     * keyring holds the authority only when it carries the envelope at
     * `holder`.
     */
    const signerHoldingWith = (live: number, holder: number | undefined) => ({
      request: vi.fn(async (kind: string, payload: unknown) => {
        const sent = sentEnvelopes(payload);
        if (kind === 'find-live-envelope') {
          const position = sent.indexOf(hexOf(envelopeAt(live)));
          return position === -1 ? null : position;
        }
        return holder !== undefined && sent.includes(hexOf(envelopeAt(holder)));
      }),
    });
    const holdingPages = (client: ReturnType<typeof signerHoldingWith>) =>
      client.request.mock.calls
        .filter(([kind]) => kind === 'holds-maintenance-authority')
        .map(([, payload]) => sentEnvelopes(payload));

    it('asks over the live envelope beside each run of the older ones, each within one request, answering true at the first that holds the authority', async () => {
      const client = signerHoldingWith(1, flooded.envelopes.length - 1);

      await expect(
        createRemoteEncryptionKey(client).holdsMaintenanceAuthority(
          'undeployed',
          flooded,
          maintenance.authority,
        ),
      ).resolves.toBe(true);

      const hexes = flooded.envelopes.map(envelope => hexOf(envelope));
      const run = MAX_INBOX_ENTRIES_PER_REQUEST - 1;
      expect(holdingPages(client)).toEqual([
        [hexes[1], ...hexes.slice(2, 2 + run)],
        [hexes[1], ...hexes.slice(2 + run, 2 + run * 2)],
        [hexes[1], ...hexes.slice(2 + run * 2)],
      ]);
    });

    it('answers false once no page holds the authority, never sending a newer envelope', async () => {
      const client = signerHoldingWith(3, undefined);

      await expect(
        createRemoteEncryptionKey(client).holdsMaintenanceAuthority(
          'undeployed',
          flooded,
          maintenance.authority,
        ),
      ).resolves.toBe(false);
      const hexes = flooded.envelopes.map(envelope => hexOf(envelope));
      const pages = holdingPages(client);
      expect(pages.flat()).not.toContain(hexes[0]);
      expect(new Set(pages.flat())).toEqual(new Set(hexes.slice(3)));
    });

    it.each([-1, 1.5, '0', MAX_INBOX_ENTRIES_PER_REQUEST])(
      'refuses a live position the page does not have: %s',
      async answer => {
        const encryptionKey = createRemoteEncryptionKey({
          request: vi.fn(async () => answer),
        });

        await expect(
          encryptionKey.sealView('undeployed', flooded, {
            grantId: 'ab'.repeat(32) as GrantId,
            account: 'cd'.repeat(32) as AccAddress,
            readPublicKey: 'ef'.repeat(32),
          }),
        ).rejects.toThrow(new MalformedPayloadError('live'));
      },
    );
  });
});
