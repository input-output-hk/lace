import { EntropyHex, Mnemonic } from '@lace-lib/crypto';
import { bytesToHex } from '@noble/hashes/utils';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  createPasskeySessionKeySource,
  HKDF_RECORD_KEY_INFO,
  HKDF_WALLET_ENTROPY_INFO,
  PasskeyCeremonyCancelledError,
  PasskeyCredentialMismatchError,
  PasskeyPrfUnsupportedError,
  PRF_SALT_AUTHORISER_LABEL,
  PRF_SALT_ROOT_LABEL,
} from '../src';

const PRF_LENGTH = 32;
const AES_GCM_IV_LENGTH = 12;

const deviceOutput = () =>
  Uint8Array.from({ length: PRF_LENGTH }, (_, index) => index + 1);
const rootOutput = () =>
  Uint8Array.from({ length: PRF_LENGTH }, (_, index) => 255 - index);
const zeroed = () => new Uint8Array(PRF_LENGTH);

const utf8 = (value: string): Uint8Array<ArrayBuffer> =>
  new TextEncoder().encode(value) as Uint8Array<ArrayBuffer>;

const sha256 = async (label: string): Promise<Uint8Array> =>
  new Uint8Array(await crypto.subtle.digest('SHA-256', utf8(label)));

const importAesKey = async (raw: Uint8Array<ArrayBuffer>) =>
  crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, [
    'encrypt',
    'decrypt',
  ]);

const webCryptoHkdf = async (root: Uint8Array<ArrayBuffer>, info: string) => {
  const material = await crypto.subtle.importKey('raw', root, 'HKDF', false, [
    'deriveBits',
  ]);
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: new Uint8Array(0),
      info: utf8(info),
    },
    material,
    PRF_LENGTH * 8,
  );
  return new Uint8Array(bits);
};

const webCryptoRecordKey = async (root: Uint8Array<ArrayBuffer>) =>
  importAesKey(await webCryptoHkdf(root, HKDF_RECORD_KEY_INFO));

const sealAndOpen = async (sealing: CryptoKey, opening: CryptoKey) => {
  const iv = new Uint8Array(AES_GCM_IV_LENGTH);
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    sealing,
    utf8('probe'),
  );
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    opening,
    ciphertext,
  );
  return new TextDecoder().decode(plaintext);
};

type PrfResults = { first?: Uint8Array; second?: Uint8Array };

const assertionCredential = (rawId: ArrayBuffer, results?: PrfResults) =>
  ({
    rawId,
    getClientExtensionResults: () => (results ? { prf: { results } } : {}),
  } as unknown as Credential);

const creationCredential = (rawId: ArrayBuffer, enabled?: boolean) =>
  ({
    rawId,
    getClientExtensionResults: () =>
      enabled === undefined ? {} : { prf: { enabled } },
  } as unknown as Credential);

const setup = () => {
  const createRawId = Uint8Array.from({ length: 16 }, () => 0xc0).buffer;
  const getRawId = Uint8Array.from({ length: 16 }, () => 0xa5).buffer;
  const returned: { first: Uint8Array; second: Uint8Array }[] = [];

  const create = vi.fn(async (_options?: CredentialCreationOptions) =>
    creationCredential(createRawId, true),
  );
  const get = vi.fn(async (_options?: CredentialRequestOptions) => {
    const outputs = { first: deviceOutput(), second: rootOutput() };
    returned.push(outputs);
    return assertionCredential(
      create.mock.calls.length ? createRawId : getRawId,
      outputs,
    );
  });

  const source = createPasskeySessionKeySource({
    rpId: 'localhost',
    credentials: { create, get } as unknown as CredentialsContainer,
  });

  return { source, create, get, returned, createRawId, getRawId };
};

const requestedPrfEval = (options: CredentialRequestOptions | undefined) => {
  const evaluation = options?.publicKey?.extensions?.prf?.eval;
  if (!evaluation) throw new Error('No prf eval was requested');
  return evaluation;
};

const cancellation = () =>
  Object.assign(new Error('The operation was cancelled.'), {
    name: 'NotAllowedError',
  });

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('createPasskeySessionKeySource', () => {
  it('exposes only named derivations and no accessor for the root', () => {
    expect(Object.keys(setup().source).sort()).toEqual([
      'credentialRef',
      'deriveSecret',
      'deviceSecret',
      'ensureCredential',
      'recordKey',
      'withPasskeyMnemonic',
      'withSession',
    ]);
    expect(setup().source).not.toHaveProperty('withSessionMnemonic');
  });

  it('defaults to the credentials of the page', async () => {
    const get = vi.fn(async () =>
      assertionCredential(new ArrayBuffer(16), {
        first: deviceOutput(),
        second: rootOutput(),
      }),
    );
    vi.stubGlobal('navigator', { credentials: { get } });

    await expect(
      createPasskeySessionKeySource({ rpId: 'localhost' }).deviceSecret(),
    ).resolves.toEqual(deviceOutput());
    expect(get).toHaveBeenCalledOnce();
  });

  it('evaluates the PRF at the SHA-256 of both salt labels', async () => {
    const { source, get } = setup();
    await source.deviceSecret();

    const evaluation = requestedPrfEval(get.mock.calls[0][0]);
    expect(evaluation.first).toEqual(await sha256(PRF_SALT_AUTHORISER_LABEL));
    expect(evaluation.second).toEqual(await sha256(PRF_SALT_ROOT_LABEL));
  });

  it('sends an explicit RP ID on assertions', async () => {
    const { source, get } = setup();
    await source.deviceSecret();
    expect(get.mock.calls[0][0]?.publicKey?.rpId).toBe('localhost');
  });

  it('restores the credential reference and refuses a different credential', async () => {
    const { source, get, getRawId } = setup();
    await source.deviceSecret();
    const ref = source.credentialRef();
    expect(ref).toEqual({
      credentialId: 'paWlpaWlpaWlpaWlpaWlpQ',
      rpId: 'localhost',
      recipeVersion: 'v1',
    });
    const restored = createPasskeySessionKeySource({
      rpId: ref!.rpId,
      credentialId: ref!.credentialId,
      credentials: { get } as unknown as CredentialsContainer,
    });
    expect(await restored.ensureCredential()).toEqual(ref);
    await restored.withPasskeyMnemonic(async () => undefined);
    expect(get.mock.lastCall?.[0]?.publicKey?.allowCredentials).toEqual([
      { type: 'public-key', id: getRawId },
    ]);
    get.mockResolvedValueOnce(
      assertionCredential(new Uint8Array(16).buffer, {
        first: deviceOutput(),
        second: rootOutput(),
      }),
    );
    await expect(
      restored.withPasskeyMnemonic(async () => undefined),
    ).rejects.toThrow(PasskeyCredentialMismatchError);
    expect(restored.credentialRef()).toEqual(ref);
  });

  it('rejects malformed, noncanonical and oversized imported credential IDs before WebAuthn', () => {
    const { get } = setup();
    for (const credentialId of [
      '',
      'a',
      'ab',
      'Zg==',
      'Zh',
      'Zg+',
      'Zg/',
      btoa(String.fromCharCode(...new Uint8Array(1024)))
        .replaceAll('+', '-')
        .replaceAll('/', '_')
        .replace(/=+$/, ''),
      'a'.repeat(1366),
    ]) {
      expect(() =>
        createPasskeySessionKeySource({
          rpId: 'localhost',
          credentialId,
          credentials: { get } as unknown as CredentialsContainer,
        }),
      ).toThrow('Invalid passkey credential ID.');
    }
    expect(get).not.toHaveBeenCalled();
  });

  it('accepts the maximum WebAuthn credential ID length', () => {
    const credentialId = btoa(String.fromCharCode(...new Uint8Array(1023)))
      .replaceAll('+', '-')
      .replaceAll('/', '_')
      .replace(/=+$/, '');
    expect(
      createPasskeySessionKeySource({
        rpId: 'localhost',
        credentialId,
      }).credentialRef()?.credentialId,
    ).toBe(credentialId);
  });

  it('hands out the device-salt output as a copy the caller owns', async () => {
    const { source, returned } = setup();
    const secret = await source.deviceSecret();

    expect(secret).toEqual(deviceOutput());
    expect(secret).not.toEqual(rootOutput());
    expect(returned[0].first).toEqual(zeroed());
  });

  it('runs a fresh ceremony for every accessor call outside a session', async () => {
    const { source, get } = setup();
    await source.deviceSecret();
    await source.deviceSecret();
    expect(get).toHaveBeenCalledTimes(2);
  });

  it('zeroes both PRF outputs after a standalone device-secret call', async () => {
    const { source, returned } = setup();
    await source.deviceSecret();

    expect(returned[0].first).toEqual(zeroed());
    expect(returned[0].second).toEqual(zeroed());
  });

  it('zeroes both PRF outputs after a standalone record-key call', async () => {
    const { source, returned } = setup();
    await source.recordKey();

    expect(returned[0].first).toEqual(zeroed());
    expect(returned[0].second).toEqual(zeroed());
  });

  it('zeroes both PRF outputs when the record key cannot be imported', async () => {
    const { source, returned } = setup();
    vi.spyOn(crypto.subtle, 'importKey').mockRejectedValueOnce(
      new Error('import refused'),
    );

    await expect(source.deviceSecret()).rejects.toThrow('import refused');
    expect(returned[0].first).toEqual(zeroed());
    expect(returned[0].second).toEqual(zeroed());
  });

  it('accepts PRF outputs handed back as plain ArrayBuffers', async () => {
    const { source, get, getRawId } = setup();
    get.mockResolvedValueOnce(
      assertionCredential(getRawId, {
        first: deviceOutput().buffer as never,
        second: rootOutput().buffer as never,
      }),
    );
    await expect(source.deviceSecret()).resolves.toEqual(deviceOutput());
  });

  it('maps a dismissed assertion prompt to CeremonyCancelledError', async () => {
    const { source, get } = setup();
    get.mockRejectedValueOnce(cancellation());
    await expect(source.deviceSecret()).rejects.toThrow(
      PasskeyCeremonyCancelledError,
    );
  });

  it('maps a null assertion to CeremonyCancelledError', async () => {
    const { source, get } = setup();
    get.mockResolvedValueOnce(null as never);
    await expect(source.deviceSecret()).rejects.toThrow(
      PasskeyCeremonyCancelledError,
    );
  });

  it('passes an unrelated assertion failure through unchanged', async () => {
    const { source, get } = setup();
    get.mockRejectedValueOnce(new Error('security key unplugged'));
    await expect(source.deviceSecret()).rejects.toThrow(
      'security key unplugged',
    );
  });

  it.each([
    ['no prf output at all', undefined],
    ['a missing second output', { first: deviceOutput() }],
  ] as const)('maps %s to PrfUnsupportedError', async (_name, results) => {
    const { source, get, getRawId } = setup();
    get.mockResolvedValueOnce(assertionCredential(getRawId, results));
    await expect(source.deviceSecret()).rejects.toThrow(
      PasskeyPrfUnsupportedError,
    );
  });

  it('starts with a discoverable get and pins later ceremonies to the asserted credential', async () => {
    const { source, get, getRawId } = setup();
    await source.deviceSecret();
    await source.deviceSecret();

    const discoverable = get.mock.calls[0][0]?.publicKey;
    expect(discoverable).not.toHaveProperty('allowCredentials');
    expect(get.mock.calls[1][0]?.publicKey?.allowCredentials).toEqual([
      { type: 'public-key', id: getRawId },
    ]);
  });

  describe('recordKey', () => {
    it('is HKDF-SHA256 of the root under the record-key label, imported as a non-extractable AES-GCM key', async () => {
      const { source } = setup();
      const recordKey = await source.recordKey();

      expect(recordKey.extractable).toBe(false);
      expect(recordKey.algorithm.name).toBe('AES-GCM');
      await expect(
        sealAndOpen(recordKey, await webCryptoRecordKey(rootOutput())),
      ).resolves.toBe('probe');
    });

    it('is not the root imported directly', async () => {
      const { source } = setup();
      const recordKey = await source.recordKey();

      await expect(
        sealAndOpen(recordKey, await importAesKey(rootOutput())),
      ).rejects.toThrow();
    });

    it('is the same key for two key sources over the same PRF output', async () => {
      const first = await setup().source.recordKey();
      const second = await setup().source.recordKey();

      await expect(sealAndOpen(first, second)).resolves.toBe('probe');
    });

    it('is cached so it does not prompt again after a ceremony', async () => {
      const { source, get } = setup();
      await source.deviceSecret();
      await source.recordKey();
      await source.recordKey();
      expect(get).toHaveBeenCalledTimes(1);
    });

    it('is derived once and reused by later ceremonies', async () => {
      const { source } = setup();
      const importKey = vi.spyOn(crypto.subtle, 'importKey');

      const first = await source.recordKey();
      await source.deviceSecret();
      await expect(source.recordKey()).resolves.toBe(first);

      expect(importKey).toHaveBeenCalledTimes(1);
    });
  });

  describe('withPasskeyMnemonic', () => {
    it('derives the same words from the independently calculated wallet entropy', async () => {
      const { source } = setup();
      const entropy = bytesToHex(
        await webCryptoHkdf(rootOutput(), HKDF_WALLET_ENTROPY_INFO),
      );
      const expected = Mnemonic.deriveFrom(EntropyHex(entropy));
      await expect(
        source.withPasskeyMnemonic(async words => [...words]),
      ).resolves.toEqual(expected);
    });

    it('performs a fresh assertion for each signature even inside a Passport session', async () => {
      const { source, get, returned } = setup();
      await source.withSession(async () => {
        await source.deviceSecret();
        await source.withPasskeyMnemonic(async () => undefined);
        await source.withPasskeyMnemonic(async () => undefined);
      });
      expect(get).toHaveBeenCalledTimes(3);
      for (const output of returned) {
        expect(output.first).toEqual(zeroed());
        expect(output.second).toEqual(zeroed());
      }
    });

    it('zeroes outputs after callback rejection', async () => {
      const { source, returned } = setup();
      await expect(
        source.withPasskeyMnemonic(async () => {
          throw new Error('sign failed');
        }),
      ).rejects.toThrow('sign failed');
      expect(returned[0].second).toEqual(zeroed());
    });

    it('rolls back a discovered credential when the callback rejects', async () => {
      const { source, get } = setup();
      await expect(
        source.withPasskeyMnemonic(async () => {
          expect(source.credentialRef()?.credentialId).toBe(
            'paWlpaWlpaWlpaWlpaWlpQ',
          );
          throw new Error('binding rejected');
        }),
      ).rejects.toThrow('binding rejected');
      expect(source.credentialRef()).toBeUndefined();

      const acceptedRawId = Uint8Array.from([1, 2, 3]).buffer;
      get.mockResolvedValueOnce(
        assertionCredential(acceptedRawId, {
          first: deviceOutput(),
          second: rootOutput(),
        }),
      );
      await source.withPasskeyMnemonic(async () => undefined);

      expect(get.mock.calls[0][0]?.publicKey).not.toHaveProperty(
        'allowCredentials',
      );
      expect(get.mock.calls[1][0]?.publicKey).not.toHaveProperty(
        'allowCredentials',
      );
      expect(source.credentialRef()?.credentialId).toBe('AQID');
    });

    it('keeps a provisional credential committed by another holder', async () => {
      const { source, get, getRawId } = setup();
      let rejectCallback: (() => void) | undefined;
      const rejected = source.withPasskeyMnemonic(
        async () =>
          new Promise<never>((_resolve, reject) => {
            rejectCallback = () => {
              reject(new Error('binding rejected'));
            };
          }),
      );
      await vi.waitFor(() => {
        expect(rejectCallback).toBeDefined();
      });

      await source.deviceSecret();
      expect(get.mock.calls[1][0]?.publicKey?.allowCredentials).toEqual([
        { type: 'public-key', id: getRawId },
      ]);

      rejectCallback!();
      await expect(rejected).rejects.toThrow('binding rejected');
      expect(source.credentialRef()?.credentialId).toBe(
        'paWlpaWlpaWlpaWlpaWlpQ',
      );
    });
  });

  describe('deriveSecret', () => {
    const params = {
      domain: 'lace-passport:acc-enc:v1',
      context: '0',
    };

    it('preserves the Passport account-encryption fixture', async () => {
      expect(bytesToHex(await setup().source.deriveSecret(params))).toBe(
        '425e292c717d219e662728ce2d5160a2a20725297ae989bda9135300538312ca',
      );
    });

    it('prompts per standalone derivation and reuses the active session assertion', async () => {
      const { source, get } = setup();
      await source.deriveSecret(params);
      await source.deriveSecret(params);
      expect(get).toHaveBeenCalledTimes(2);

      await source.withSession(async () => {
        await source.deriveSecret(params);
        await source.deriveSecret({ ...params, context: '1' });
      });
      expect(get).toHaveBeenCalledTimes(3);
    });

    it.each([
      [
        'domain',
        { domain: '', context: '0' },
        'MIP-0015 domain must encode to 1..256 bytes, got 0',
      ],
      [
        'context',
        { ...params, context: 'c'.repeat(1025) },
        'MIP-0015 context must encode to at most 1024 bytes, got 1025',
      ],
      [
        'length',
        { ...params, length: 8 },
        'MIP-0015 secret length must be an integer in 16..64, got 8',
      ],
    ] as const)(
      'preserves %s validation errors',
      async (_name, invalid, error) => {
        await expect(setup().source.deriveSecret(invalid)).rejects.toThrow(
          error,
        );
      },
    );

    it('zeroes the BIP-39 seed after success and derivation failure', async () => {
      const { source } = setup();
      const toSeed = vi.spyOn(Mnemonic, 'toSeed');

      await source.deriveSecret(params);
      await expect(
        source.deriveSecret({ ...params, length: 8 }),
      ).rejects.toThrow();

      expect(toSeed.mock.results[0].value).toEqual(new Uint8Array(64));
      expect(toSeed.mock.results[1].value).toEqual(new Uint8Array(64));
    });

    it('zeroes both PRF outputs after success and derivation failure', async () => {
      const { source, returned } = setup();

      await source.deriveSecret(params);
      await expect(
        source.deriveSecret({ ...params, length: 8 }),
      ).rejects.toThrow();

      for (const output of returned) {
        expect(output.first).toEqual(zeroed());
        expect(output.second).toEqual(zeroed());
      }
    });
  });

  describe('withSession', () => {
    const overlappingSessions = async () => {
      const context = setup();
      const { source } = context;
      let releaseOwner: (() => void) | undefined;
      let releaseJoiner: (() => void) | undefined;

      const owner = source.withSession(async () => {
        await source.deviceSecret();
        await new Promise<void>(resolve => {
          releaseOwner = resolve;
        });
      });
      await vi.waitFor(() => {
        expect(releaseOwner).toBeDefined();
      });

      const joiner = source.withSession(async () => {
        await new Promise<void>(resolve => {
          releaseJoiner = resolve;
        });
        return source.deviceSecret();
      });
      await vi.waitFor(() => {
        expect(releaseJoiner).toBeDefined();
      });

      return {
        ...context,
        settleOwner: async () => {
          releaseOwner?.();
          return owner;
        },
        settleJoiner: async () => {
          releaseJoiner?.();
          return joiner;
        },
      };
    };

    it('serves every accessor call in the session from one ceremony', async () => {
      const { source, get } = setup();

      const inSession = await source.withSession(async () => ({
        first: await source.deviceSecret(),
        second: await source.deviceSecret(),
        recordKey: await source.recordKey(),
      }));
      expect(get).toHaveBeenCalledOnce();

      expect(inSession.first).toEqual(deviceOutput());
      expect(inSession.second).toEqual(deviceOutput());
      expect(inSession.recordKey).toBe(await source.recordKey());
    });

    it('hands out copies so zeroing one leaves the session intact', async () => {
      const { source } = setup();

      await source.withSession(async () => {
        const first = await source.deviceSecret();
        first.fill(0);
        await expect(source.deviceSecret()).resolves.toEqual(deviceOutput());
      });
    });

    it('joins the open session from a nested session', async () => {
      const { source, get } = setup();

      const secret = await source.withSession(async () => {
        const nested = await source.withSession(async () =>
          source.deviceSecret(),
        );
        await source.deviceSecret();
        return nested;
      });

      expect(secret).toEqual(deviceOutput());
      expect(get).toHaveBeenCalledOnce();
    });

    it('joins the open session from an overlapping flow', async () => {
      const { source, get } = setup();
      let release: (() => void) | undefined;

      const first = source.withSession(async () => {
        await source.deviceSecret();
        await new Promise<void>(resolve => {
          release = resolve;
        });
      });
      await vi.waitFor(() => {
        expect(release).toBeDefined();
      });

      await expect(
        source.withSession(async () => source.deviceSecret()),
      ).resolves.toEqual(deviceOutput());
      expect(get).toHaveBeenCalledOnce();

      release?.();
      await first;
    });

    it('keeps the session open for a joiner once the owner settled', async () => {
      const { get, settleOwner, settleJoiner } = await overlappingSessions();

      await settleOwner();
      await expect(settleJoiner()).resolves.toEqual(deviceOutput());
      expect(get).toHaveBeenCalledOnce();
    });

    it('zeroes both PRF outputs only once both overlapping sessions settled', async () => {
      const { returned, settleOwner, settleJoiner } =
        await overlappingSessions();

      await settleOwner();
      expect(returned[0].first).not.toEqual(zeroed());

      await settleJoiner();
      expect(returned[0].first).toEqual(zeroed());
      expect(returned[0].second).toEqual(zeroed());
    });

    it('runs a fresh ceremony after both overlapping sessions settled', async () => {
      const { source, get, settleOwner, settleJoiner } =
        await overlappingSessions();

      await settleOwner();
      await settleJoiner();
      expect(get).toHaveBeenCalledOnce();

      await source.deviceSecret();
      expect(get).toHaveBeenCalledTimes(2);
    });

    it('keeps the outputs for a standalone accessor that joins as the owner settles', async () => {
      const { source, get } = setup();
      let late: Promise<Uint8Array> | undefined;

      await source.withSession(async () => {
        await source.deviceSecret();
        late = Promise.resolve().then(async () => source.deviceSecret());
      });

      await expect(late).resolves.toEqual(deviceOutput());
      expect(get).toHaveBeenCalledOnce();
    });

    it('zeroes both PRF outputs after the session settles', async () => {
      const { source, returned } = setup();
      await source.withSession(async () => {
        await source.deviceSecret();
        expect(returned[0].first).not.toEqual(zeroed());
      });

      expect(returned[0].first).toEqual(zeroed());
      expect(returned[0].second).toEqual(zeroed());
    });

    it('zeroes both PRF outputs when the session fails', async () => {
      const { source, returned } = setup();
      await expect(
        source.withSession(async () => {
          await source.deviceSecret();
          throw new Error('flow lost');
        }),
      ).rejects.toThrow('flow lost');

      expect(returned[0].first).toEqual(zeroed());
      expect(returned[0].second).toEqual(zeroed());
    });

    it('runs a fresh ceremony for a call made after the session closed', async () => {
      const { source, get } = setup();
      await source.withSession(async () => {
        await source.deviceSecret();
      });
      expect(get).toHaveBeenCalledOnce();

      await source.deviceSecret();
      expect(get).toHaveBeenCalledTimes(2);
    });

    it('maps a dismissed prompt to CeremonyCancelledError and closes the session', async () => {
      const { source, get } = setup();
      get.mockRejectedValueOnce(cancellation());

      await expect(
        source.withSession(async () => source.deviceSecret()),
      ).rejects.toThrow(PasskeyCeremonyCancelledError);

      await expect(
        source.withSession(async () => source.deviceSecret()),
      ).resolves.toEqual(deviceOutput());
      expect(get).toHaveBeenCalledTimes(2);
    });
  });

  describe('ensureCredential', () => {
    it('shares an in-flight creation and retries after a failure', async () => {
      const { source, create, createRawId } = setup();
      let complete: ((credential: Credential) => void) | undefined;
      create.mockImplementationOnce(
        async () =>
          new Promise(resolve => {
            complete = resolve;
          }),
      );
      const first = source.ensureCredential();
      const second = source.ensureCredential();
      await vi.waitFor(() => {
        expect(create).toHaveBeenCalledOnce();
      });
      complete!(creationCredential(createRawId, true));
      expect(await first).toEqual(await second);
      expect(create).toHaveBeenCalledOnce();

      const failed = setup();
      failed.create.mockRejectedValueOnce(new Error('retry'));
      await expect(failed.source.ensureCredential()).rejects.toThrow('retry');
      await failed.source.ensureCredential();
      expect(failed.create).toHaveBeenCalledTimes(2);
    });
    it('creates a resident, user-verified platform passkey evaluating both salts', async () => {
      const { source, create } = setup();
      await source.ensureCredential();

      const options = create.mock.calls[0][0]?.publicKey;
      expect(options?.authenticatorSelection).toEqual({
        authenticatorAttachment: 'platform',
        residentKey: 'required',
        userVerification: 'required',
      });
      const evaluation = options?.extensions?.prf?.eval;
      expect(evaluation?.first).toEqual(
        await sha256(PRF_SALT_AUTHORISER_LABEL),
      );
      expect(evaluation?.second).toEqual(await sha256(PRF_SALT_ROOT_LABEL));
      expect(options?.rp?.id).toBe('localhost');
    });

    it('pins the next ceremony to the created credential', async () => {
      const { source, get, createRawId } = setup();
      await source.ensureCredential();
      await source.deviceSecret();

      expect(get.mock.calls[0][0]?.publicKey?.allowCredentials).toEqual([
        { type: 'public-key', id: createRawId },
      ]);
    });

    it('does not create a second credential once one is known', async () => {
      const { source, create } = setup();
      await source.ensureCredential();
      await source.ensureCredential();
      expect(create).toHaveBeenCalledTimes(1);
    });

    it('maps a dismissed creation prompt to CeremonyCancelledError', async () => {
      const { source, create } = setup();
      create.mockRejectedValueOnce(cancellation());
      await expect(source.ensureCredential()).rejects.toThrow(
        PasskeyCeremonyCancelledError,
      );
    });

    it('maps a null creation to CeremonyCancelledError', async () => {
      const { source, create } = setup();
      create.mockResolvedValueOnce(null as never);
      await expect(source.ensureCredential()).rejects.toThrow(
        PasskeyCeremonyCancelledError,
      );
    });

    it('passes an unrelated creation failure through unchanged', async () => {
      const { source, create } = setup();
      create.mockRejectedValueOnce(new Error('authenticator timeout'));
      await expect(source.ensureCredential()).rejects.toThrow(
        'authenticator timeout',
      );
    });

    it('maps an authenticator without PRF support to PrfUnsupportedError', async () => {
      const { source, create, createRawId } = setup();
      create.mockResolvedValueOnce(creationCredential(createRawId));
      await expect(source.ensureCredential()).rejects.toThrow(
        PasskeyPrfUnsupportedError,
      );
    });
  });
});
