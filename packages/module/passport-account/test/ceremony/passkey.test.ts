import {
  AccAddress,
  CeremonyCancelledError,
  DeviceEpoch,
  PRF_SALT_AUTHORISER_LABEL,
  PRF_SALT_STORAGE_LABEL,
  PrfUnsupportedError,
  UseCounter,
} from '@lace-contract/passport';
import { HexBytes } from '@lace-lib/util';
import { describe, expect, it, vi } from 'vitest';

import { UnknownCircuitError } from '../../src/acc/artefact-loader';
import { jubjubChallenges } from '../../src/acc/challenges';
import { bytesToBigIntLE, JUBJUB_R, JubjubDevice } from '../../src/acc/signer';
import { loadJubjubSigning } from '../../src/acc/signing-loader';
import { createPasskeyAuthoriser } from '../../src/ceremony/passkey';

import type { AuthorisationRequest } from '@lace-contract/passport';

vi.mock(import('../../src/acc/signing-loader'), async importOriginal => {
  const actual = await importOriginal();
  return { loadJubjubSigning: vi.fn(actual.loadJubjubSigning) };
});

const PRF_LENGTH = 32;

const authoriserOutput = () =>
  Uint8Array.from({ length: PRF_LENGTH }, (_, index) => index + 1);
const storageOutput = () =>
  Uint8Array.from({ length: PRF_LENGTH }, (_, index) => 255 - index);

const referenceDevice = () =>
  new JubjubDevice(bytesToBigIntLE(authoriserOutput()) % JUBJUB_R);

const CONTRACT_ADDRESS = Uint8Array.from(
  { length: 32 },
  (_, index) => index + 1,
);
const ACCOUNT = AccAddress(HexBytes.fromByteArray(CONTRACT_ADDRESS));
const NEW_ENTRY = new Uint8Array(32).fill(0x5a);

const addDeviceRequest: AuthorisationRequest = {
  account: ACCOUNT,
  circuit: 'add_device_with_jubjub',
  args: [NEW_ENTRY],
  witnessValues: [],
  authNonce: 7n,
  useCounter: UseCounter(3n),
};

const sha256 = async (label: string): Promise<Uint8Array> =>
  new Uint8Array(
    await crypto.subtle.digest('SHA-256', new TextEncoder().encode(label)),
  );

const importAesKey = async (raw: Uint8Array<ArrayBuffer>) =>
  crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, [
    'encrypt',
    'decrypt',
  ]);

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
    const secrets = { first: authoriserOutput(), second: storageOutput() };
    returned.push(secrets);
    return assertionCredential(getRawId, secrets);
  });

  const authoriser = createPasskeyAuthoriser({
    credentials: { create, get } as unknown as CredentialsContainer,
  });

  return { authoriser, create, get, returned, createRawId, getRawId };
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

describe('createPasskeyAuthoriser', () => {
  it('implements the jubjub-schnorr scheme', () => {
    expect(setup().authoriser.scheme).toBe('jubjub-schnorr');
  });

  it('evaluates the PRF at the SHA-256 of both salt labels', async () => {
    const { authoriser, get } = setup();
    await authoriser.devicePublicKey();

    const evaluation = requestedPrfEval(get.mock.calls[0][0]);
    expect(evaluation.first).toEqual(await sha256(PRF_SALT_AUTHORISER_LABEL));
    expect(evaluation.second).toEqual(await sha256(PRF_SALT_STORAGE_LABEL));
  });

  it('reduces the authoriser-salt output to the signing scalar of the signer math', async () => {
    const { authoriser } = setup();
    await expect(authoriser.devicePublicKey()).resolves.toEqual(
      referenceDevice().pk,
    );
  });

  it('authorises an addDevice call with a verifiable challenge', async () => {
    const { authoriser } = setup();
    const authorisation = await authoriser.authorise(addDeviceRequest);

    expect(authorisation.scheme).toBe('jubjub-schnorr');
    expect(authorisation.pk).toEqual(referenceDevice().pk);
    expect(authorisation.useCounter).toBe(3n);
    expect(authorisation.sigS).toBeLessThan(JUBJUB_R);

    const builder = jubjubChallenges.addDevice(
      { contractAddress: CONTRACT_ADDRESS, authNonce: 7n },
      authorisation.pk,
      NEW_ENTRY,
    );
    expect(
      bytesToBigIntLE(builder(authorisation.sigR, authorisation.grindNonce)),
    ).toBeLessThan(JUBJUB_R);
  });

  it('rejects circuits without a challenge builder', async () => {
    const { authoriser } = setup();
    await expect(
      authoriser.authorise({ ...addDeviceRequest, circuit: 'withdraw' }),
    ).rejects.toThrow(UnknownCircuitError);
  });

  it('runs a fresh ceremony for every authoriser call', async () => {
    const { authoriser, get } = setup();
    await authoriser.devicePublicKey();
    await authoriser.devicePublicKey();
    expect(get).toHaveBeenCalledTimes(2);
  });

  it('retries loading the signing modules after a failed load', async () => {
    const { authoriser } = setup();
    vi.mocked(loadJubjubSigning).mockRejectedValueOnce(
      new Error('chunk load failed'),
    );

    await expect(authoriser.devicePublicKey()).rejects.toThrow(
      'chunk load failed',
    );
    await expect(authoriser.devicePublicKey()).resolves.toEqual(
      referenceDevice().pk,
    );
  });

  it('computes a multi-counter commitment batch in a single ceremony', async () => {
    const { authoriser, get } = setup();
    const counters = [UseCounter(0n), UseCounter(1n), UseCounter(2n)];

    const batch = await authoriser.deviceCommitments!(
      ACCOUNT,
      DeviceEpoch(0n),
      counters,
    );
    expect(get).toHaveBeenCalledTimes(1);

    const perCall = [];
    for (const counter of counters) {
      perCall.push(
        await authoriser.deviceCommitment(ACCOUNT, DeviceEpoch(0n), counter),
      );
    }
    expect(batch).toEqual(perCall);
  });

  it('zeroes both PRF outputs after a batched commitment lookup', async () => {
    const { authoriser, returned } = setup();
    await authoriser.deviceCommitments!(ACCOUNT, DeviceEpoch(0n), [
      UseCounter(0n),
      UseCounter(1n),
    ]);

    expect(returned[0].first).toEqual(new Uint8Array(PRF_LENGTH));
    expect(returned[0].second).toEqual(new Uint8Array(PRF_LENGTH));
  });

  it('zeroes both PRF outputs when the batched lookup fails', async () => {
    const { authoriser, returned } = setup();
    await expect(
      authoriser.deviceCommitments!(AccAddress('not-hex'), DeviceEpoch(0n), [
        UseCounter(0n),
      ]),
    ).rejects.toThrow(/lowercase hex/);

    expect(returned[0].first).toEqual(new Uint8Array(PRF_LENGTH));
    expect(returned[0].second).toEqual(new Uint8Array(PRF_LENGTH));
  });

  it('imports the storage-salt output as a non-extractable AES-GCM key', async () => {
    const { authoriser } = setup();
    const storageKey = await authoriser.storageKey();

    expect(storageKey.extractable).toBe(false);
    expect(storageKey.algorithm.name).toBe('AES-GCM');

    const reference = await importAesKey(storageOutput());
    const iv = new Uint8Array(12);
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      storageKey,
      new TextEncoder().encode('probe'),
    );
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      reference,
      ciphertext,
    );
    expect(new TextDecoder().decode(plaintext)).toBe('probe');
  });

  it('caches the storage key so it does not prompt again after a ceremony', async () => {
    const { authoriser, get } = setup();
    await authoriser.devicePublicKey();
    await authoriser.storageKey();
    await authoriser.storageKey();
    expect(get).toHaveBeenCalledTimes(1);
  });

  it('zeroes both PRF outputs after a successful operation', async () => {
    const { authoriser, returned } = setup();
    await authoriser.devicePublicKey();

    expect(returned[0].first).toEqual(new Uint8Array(PRF_LENGTH));
    expect(returned[0].second).toEqual(new Uint8Array(PRF_LENGTH));
  });

  it('zeroes both PRF outputs when the operation fails', async () => {
    const { authoriser, returned } = setup();
    await expect(
      authoriser.authorise({ ...addDeviceRequest, circuit: 'withdraw' }),
    ).rejects.toThrow(UnknownCircuitError);

    expect(returned[0].first).toEqual(new Uint8Array(PRF_LENGTH));
    expect(returned[0].second).toEqual(new Uint8Array(PRF_LENGTH));
  });

  it('zeroes both PRF outputs when the storage key cannot be imported', async () => {
    const { authoriser, get, getRawId } = setup();
    const secrets = {
      first: authoriserOutput(),
      second: new Uint8Array(7).fill(9),
    };
    get.mockResolvedValueOnce(assertionCredential(getRawId, secrets));

    await expect(authoriser.devicePublicKey()).rejects.toThrow();
    expect(secrets.first).toEqual(new Uint8Array(PRF_LENGTH));
    expect(secrets.second).toEqual(new Uint8Array(7));
  });

  it('maps a dismissed assertion prompt to CeremonyCancelledError', async () => {
    const { authoriser, get } = setup();
    get.mockRejectedValueOnce(cancellation());
    await expect(authoriser.devicePublicKey()).rejects.toThrow(
      CeremonyCancelledError,
    );
  });

  it('maps a null assertion to CeremonyCancelledError', async () => {
    const { authoriser, get } = setup();
    get.mockResolvedValueOnce(null as never);
    await expect(authoriser.devicePublicKey()).rejects.toThrow(
      CeremonyCancelledError,
    );
  });

  it('passes an unrelated assertion failure through unchanged', async () => {
    const { authoriser, get } = setup();
    get.mockRejectedValueOnce(new Error('security key unplugged'));
    await expect(authoriser.devicePublicKey()).rejects.toThrow(
      'security key unplugged',
    );
  });

  it.each([
    ['no prf output at all', undefined],
    ['a missing storage output', { first: authoriserOutput() }],
  ] as const)('maps %s to PrfUnsupportedError', async (_name, results) => {
    const { authoriser, get, getRawId } = setup();
    get.mockResolvedValueOnce(assertionCredential(getRawId, results));
    await expect(authoriser.devicePublicKey()).rejects.toThrow(
      PrfUnsupportedError,
    );
  });

  it('accepts PRF outputs handed back as plain ArrayBuffers', async () => {
    const { authoriser, get, getRawId } = setup();
    get.mockResolvedValueOnce(
      assertionCredential(getRawId, {
        first: authoriserOutput().buffer as never,
        second: storageOutput().buffer as never,
      }),
    );
    await expect(authoriser.devicePublicKey()).resolves.toEqual(
      referenceDevice().pk,
    );
  });

  it('starts with a discoverable get and pins later ceremonies to the asserted credential', async () => {
    const { authoriser, get, getRawId } = setup();
    await authoriser.devicePublicKey();
    await authoriser.devicePublicKey();

    const discoverable = get.mock.calls[0][0]?.publicKey;
    expect(discoverable).not.toHaveProperty('allowCredentials');
    expect(get.mock.calls[1][0]?.publicKey?.allowCredentials).toEqual([
      { type: 'public-key', id: getRawId },
    ]);
  });

  describe('withKeySession', () => {
    const overlappingSessions = async () => {
      const context = setup();
      const { authoriser } = context;
      let releaseOwner: (() => void) | undefined;
      let releaseJoiner: (() => void) | undefined;

      const owner = authoriser.withKeySession(async () => {
        await authoriser.devicePublicKey();
        await new Promise<void>(resolve => {
          releaseOwner = resolve;
        });
      });
      await vi.waitFor(() => {
        expect(releaseOwner).toBeDefined();
      });

      const joiner = authoriser.withKeySession(async () => {
        await new Promise<void>(resolve => {
          releaseJoiner = resolve;
        });
        return authoriser.deviceCommitment(
          ACCOUNT,
          DeviceEpoch(0n),
          UseCounter(0n),
        );
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

    it('serves every authoriser call in the session from one ceremony', async () => {
      const { authoriser, get } = setup();
      const counters = [UseCounter(0n), UseCounter(1n)];

      const inSession = await authoriser.withKeySession(async () => ({
        pk: await authoriser.devicePublicKey(),
        commitment: await authoriser.deviceCommitment(
          ACCOUNT,
          DeviceEpoch(0n),
          UseCounter(0n),
        ),
        batch: await authoriser.deviceCommitments!(
          ACCOUNT,
          DeviceEpoch(0n),
          counters,
        ),
        authorisation: await authoriser.authorise(addDeviceRequest),
        storageKey: await authoriser.storageKey(),
      }));
      expect(get).toHaveBeenCalledOnce();

      expect(inSession.pk).toEqual(referenceDevice().pk);
      expect(inSession.authorisation.pk).toEqual(referenceDevice().pk);
      expect(inSession.authorisation.useCounter).toBe(3n);
      expect(inSession.storageKey).toBe(await authoriser.storageKey());
      expect(inSession.commitment).toBe(
        await authoriser.deviceCommitment(
          ACCOUNT,
          DeviceEpoch(0n),
          UseCounter(0n),
        ),
      );
      expect(inSession.batch).toEqual(
        await authoriser.deviceCommitments!(ACCOUNT, DeviceEpoch(0n), counters),
      );
    });

    it('joins the open session from a nested session', async () => {
      const { authoriser, get } = setup();

      const pk = await authoriser.withKeySession(async () => {
        const nested = await authoriser.withKeySession(async () =>
          authoriser.devicePublicKey(),
        );
        await authoriser.deviceCommitment(
          ACCOUNT,
          DeviceEpoch(0n),
          UseCounter(0n),
        );
        return nested;
      });

      expect(pk).toEqual(referenceDevice().pk);
      expect(get).toHaveBeenCalledOnce();
    });

    it('joins the open session from an overlapping flow', async () => {
      const { authoriser, get } = setup();
      let release: (() => void) | undefined;

      const first = authoriser.withKeySession(async () => {
        await authoriser.devicePublicKey();
        await new Promise<void>(resolve => {
          release = resolve;
        });
      });
      await vi.waitFor(() => {
        expect(release).toBeDefined();
      });

      await expect(
        authoriser.withKeySession(async () => authoriser.devicePublicKey()),
      ).resolves.toEqual(referenceDevice().pk);
      expect(get).toHaveBeenCalledOnce();

      release?.();
      await first;
    });

    it('keeps the session open for a joiner once the owner settled', async () => {
      const { authoriser, get, settleOwner, settleJoiner } =
        await overlappingSessions();

      await settleOwner();
      const joined = await settleJoiner();
      expect(get).toHaveBeenCalledOnce();

      expect(joined).toBe(
        await authoriser.deviceCommitment(
          ACCOUNT,
          DeviceEpoch(0n),
          UseCounter(0n),
        ),
      );
    });

    it('zeroes both PRF outputs only once both overlapping sessions settled', async () => {
      const { returned, settleOwner, settleJoiner } =
        await overlappingSessions();

      await settleOwner();
      expect(returned[0].first).not.toEqual(new Uint8Array(PRF_LENGTH));

      await settleJoiner();
      expect(returned[0].first).toEqual(new Uint8Array(PRF_LENGTH));
      expect(returned[0].second).toEqual(new Uint8Array(PRF_LENGTH));
    });

    it('runs a fresh ceremony after both overlapping sessions settled', async () => {
      const { authoriser, get, settleOwner, settleJoiner } =
        await overlappingSessions();

      await settleOwner();
      await settleJoiner();
      expect(get).toHaveBeenCalledOnce();

      await authoriser.devicePublicKey();
      expect(get).toHaveBeenCalledTimes(2);
    });

    it('zeroes both PRF outputs after the session settles', async () => {
      const { authoriser, returned } = setup();
      await authoriser.withKeySession(async () => {
        await authoriser.devicePublicKey();
        expect(returned[0].first).not.toEqual(new Uint8Array(PRF_LENGTH));
      });

      expect(returned[0].first).toEqual(new Uint8Array(PRF_LENGTH));
      expect(returned[0].second).toEqual(new Uint8Array(PRF_LENGTH));
    });

    it('zeroes both PRF outputs when the session fails', async () => {
      const { authoriser, returned } = setup();
      await expect(
        authoriser.withKeySession(async () => {
          await authoriser.devicePublicKey();
          throw new Error('flow lost');
        }),
      ).rejects.toThrow('flow lost');

      expect(returned[0].first).toEqual(new Uint8Array(PRF_LENGTH));
      expect(returned[0].second).toEqual(new Uint8Array(PRF_LENGTH));
    });

    it('runs a fresh ceremony for a call made after the session closed', async () => {
      const { authoriser, get } = setup();
      await authoriser.withKeySession(async () => {
        await authoriser.devicePublicKey();
      });
      expect(get).toHaveBeenCalledOnce();

      await authoriser.devicePublicKey();
      expect(get).toHaveBeenCalledTimes(2);
    });

    it('maps a dismissed prompt to CeremonyCancelledError and closes the session', async () => {
      const { authoriser, get } = setup();
      get.mockRejectedValueOnce(cancellation());

      await expect(
        authoriser.withKeySession(async () => authoriser.devicePublicKey()),
      ).rejects.toThrow(CeremonyCancelledError);

      await expect(
        authoriser.withKeySession(async () => authoriser.devicePublicKey()),
      ).resolves.toEqual(referenceDevice().pk);
      expect(get).toHaveBeenCalledTimes(2);
    });
  });

  describe('ensureCredential', () => {
    it('creates a resident, user-verified platform passkey evaluating both salts', async () => {
      const { authoriser, create } = setup();
      await authoriser.ensureCredential();

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
      expect(evaluation?.second).toEqual(await sha256(PRF_SALT_STORAGE_LABEL));
    });

    it('pins the next ceremony to the created credential', async () => {
      const { authoriser, get, createRawId } = setup();
      await authoriser.ensureCredential();
      await authoriser.devicePublicKey();

      expect(get.mock.calls[0][0]?.publicKey?.allowCredentials).toEqual([
        { type: 'public-key', id: createRawId },
      ]);
    });

    it('does not create a second credential once one is known', async () => {
      const { authoriser, create } = setup();
      await authoriser.ensureCredential();
      await authoriser.ensureCredential();
      expect(create).toHaveBeenCalledTimes(1);
    });

    it('maps a dismissed creation prompt to CeremonyCancelledError', async () => {
      const { authoriser, create } = setup();
      create.mockRejectedValueOnce(cancellation());
      await expect(authoriser.ensureCredential()).rejects.toThrow(
        CeremonyCancelledError,
      );
    });

    it('maps a null creation to CeremonyCancelledError', async () => {
      const { authoriser, create } = setup();
      create.mockResolvedValueOnce(null as never);
      await expect(authoriser.ensureCredential()).rejects.toThrow(
        CeremonyCancelledError,
      );
    });

    it('passes an unrelated creation failure through unchanged', async () => {
      const { authoriser, create } = setup();
      create.mockRejectedValueOnce(new Error('authenticator timeout'));
      await expect(authoriser.ensureCredential()).rejects.toThrow(
        'authenticator timeout',
      );
    });

    it('maps an authenticator without PRF support to PrfUnsupportedError', async () => {
      const { authoriser, create, createRawId } = setup();
      create.mockResolvedValueOnce(creationCredential(createRawId));
      await expect(authoriser.ensureCredential()).rejects.toThrow(
        PrfUnsupportedError,
      );
    });
  });
});
