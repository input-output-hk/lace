import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  createPasskeyKeySource,
  createPasskeySessionKeySource,
  PasskeyCeremonyCancelledError,
  PasskeyCredentialMismatchError,
  PasskeyPrfUnsupportedError,
  PRF_SALT_ROOT_LABEL,
} from '../src';

const PRF_LENGTH = 32;

const deviceOutput = () =>
  Uint8Array.from({ length: PRF_LENGTH }, (_, index) => index + 1);
const rootOutput = () =>
  Uint8Array.from({ length: PRF_LENGTH }, (_, index) => 255 - index);
const zeroed = () => new Uint8Array(PRF_LENGTH);

const sha256 = async (label: string): Promise<Uint8Array> =>
  new Uint8Array(
    await crypto.subtle.digest('SHA-256', new TextEncoder().encode(label)),
  );

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
  const returned: Uint8Array[] = [];

  const create = vi.fn(async (_options?: CredentialCreationOptions) =>
    creationCredential(createRawId, true),
  );
  const get = vi.fn(async (_options?: CredentialRequestOptions) => {
    const root = rootOutput();
    returned.push(root);
    return assertionCredential(
      create.mock.calls.length ? createRawId : getRawId,
      { first: root },
    );
  });
  const credentials = { create, get } as unknown as CredentialsContainer;
  const source = createPasskeyKeySource({ rpId: 'localhost', credentials });

  return { source, create, get, returned, createRawId, getRawId };
};

const cancellation = () =>
  Object.assign(new Error('The operation was cancelled.'), {
    name: 'NotAllowedError',
  });

afterEach(() => {
  vi.restoreAllMocks();
});

describe('createPasskeyKeySource', () => {
  it('exposes the credential and the words callback only', () => {
    expect(Object.keys(setup().source).sort()).toEqual([
      'credentialRef',
      'ensureCredential',
      'withPasskeyMnemonic',
    ]);
  });

  it('evaluates the PRF at the root salt alone', async () => {
    const { source, get } = setup();
    await source.withPasskeyMnemonic(async () => undefined);

    const evaluation = get.mock.calls[0][0]?.publicKey?.extensions?.prf?.eval;
    expect(evaluation?.first).toEqual(await sha256(PRF_SALT_ROOT_LABEL));
    expect(evaluation).not.toHaveProperty('second');
  });

  it('derives the words the session key source derives from the same passkey', async () => {
    const { source } = setup();
    const session = createPasskeySessionKeySource({
      rpId: 'localhost',
      credentials: {
        get: async () =>
          assertionCredential(new ArrayBuffer(16), {
            first: deviceOutput(),
            second: rootOutput(),
          }),
      } as unknown as CredentialsContainer,
    });

    await expect(
      source.withPasskeyMnemonic(async words => [...words]),
    ).resolves.toEqual(
      await session.withPasskeyMnemonic(async words => [...words]),
    );
  });

  it('runs a fresh assertion for every call and zeroes the root after it', async () => {
    const { source, get, returned } = setup();
    await source.withPasskeyMnemonic(async () => undefined);
    await expect(
      source.withPasskeyMnemonic(async () => {
        throw new Error('sign failed');
      }),
    ).rejects.toThrow('sign failed');

    expect(get).toHaveBeenCalledTimes(2);
    for (const root of returned) expect(root).toEqual(zeroed());
  });

  it('pins later assertions to the asserted credential and refuses another', async () => {
    const { source, get, getRawId } = setup();
    await source.withPasskeyMnemonic(async () => undefined);
    expect(source.credentialRef()).toEqual({
      credentialId: 'paWlpaWlpaWlpaWlpaWlpQ',
      rpId: 'localhost',
      recipeVersion: 'v1',
    });

    get.mockResolvedValueOnce(
      assertionCredential(new Uint8Array(16).buffer, { first: rootOutput() }),
    );
    await expect(
      source.withPasskeyMnemonic(async () => undefined),
    ).rejects.toThrow(PasskeyCredentialMismatchError);
    expect(get.mock.lastCall?.[0]?.publicKey?.allowCredentials).toEqual([
      { type: 'public-key', id: getRawId },
    ]);
  });

  it('forgets a discovered credential when the callback rejects', async () => {
    const { source } = setup();
    await expect(
      source.withPasskeyMnemonic(async () => {
        throw new Error('binding rejected');
      }),
    ).rejects.toThrow('binding rejected');
    expect(source.credentialRef()).toBeUndefined();
  });

  it('maps a dismissed prompt to CeremonyCancelledError', async () => {
    const { source, get } = setup();
    get.mockRejectedValueOnce(cancellation());
    await expect(
      source.withPasskeyMnemonic(async () => undefined),
    ).rejects.toThrow(PasskeyCeremonyCancelledError);
  });

  it('maps an assertion without a PRF output to PrfUnsupportedError', async () => {
    const { source, get, getRawId } = setup();
    get.mockResolvedValueOnce(assertionCredential(getRawId));
    await expect(
      source.withPasskeyMnemonic(async () => undefined),
    ).rejects.toThrow(PasskeyPrfUnsupportedError);
  });

  it('creates a resident, user-verified platform passkey evaluating the root salt', async () => {
    const { source, create, createRawId, get } = setup();
    await source.ensureCredential();

    const options = create.mock.calls[0][0]?.publicKey;
    expect(options?.authenticatorSelection).toEqual({
      authenticatorAttachment: 'platform',
      residentKey: 'required',
      userVerification: 'required',
    });
    expect(options?.extensions?.prf?.eval).toEqual({
      first: await sha256(PRF_SALT_ROOT_LABEL),
    });

    await source.withPasskeyMnemonic(async () => undefined);
    expect(get.mock.calls[0][0]?.publicKey?.allowCredentials).toEqual([
      { type: 'public-key', id: createRawId },
    ]);
  });

  it('maps an authenticator without PRF support to PrfUnsupportedError on creation', async () => {
    const { source, create, createRawId } = setup();
    create.mockResolvedValueOnce(creationCredential(createRawId));
    await expect(source.ensureCredential()).rejects.toThrow(
      PasskeyPrfUnsupportedError,
    );
  });
});
