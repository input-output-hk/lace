import {
  AccAddress,
  CeremonyCancelledError,
  DeviceEpoch,
  UseCounter,
} from '@lace-contract/passport';
import {
  HKDF_RECORD_KEY_INFO,
  PasskeyCeremonyCancelledError,
  PRF_SALT_AUTHORISER_LABEL,
  PRF_SALT_ROOT_LABEL,
} from '@lace-lib/passkey';
import { HexBytes } from '@lace-lib/util';
import { describe, expect, it, vi } from 'vitest';

import { UnknownCircuitError } from '../../src/acc/artefact-loader';
import { jubjubChallenges } from '../../src/acc/challenges';
import { bytesToBigIntLE, JUBJUB_R, JubjubDevice } from '../../src/acc/signer';
import { loadJubjubSigning } from '../../src/acc/signing-loader';
import { createPasskeyAuthoriser } from '../../src/ceremony/passkey';

import type { AuthorisationRequest } from '@lace-contract/passport';
import type { PasskeySessionKeySource } from '@lace-lib/passkey';

vi.mock(import('../../src/acc/signing-loader'), async importOriginal => {
  const actual = await importOriginal();
  return { loadJubjubSigning: vi.fn(actual.loadJubjubSigning) };
});

const PRF_LENGTH = 32;
const AES_GCM_IV_LENGTH = 12;

const deviceOutput = () =>
  Uint8Array.from({ length: PRF_LENGTH }, (_, index) => index + 1);
const rootOutput = () =>
  Uint8Array.from({ length: PRF_LENGTH }, (_, index) => 255 - index);
const zeroed = () => new Uint8Array(PRF_LENGTH);

const referenceDevice = () =>
  new JubjubDevice(bytesToBigIntLE(deviceOutput()) % JUBJUB_R);

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

const utf8 = (value: string): Uint8Array<ArrayBuffer> =>
  new TextEncoder().encode(value) as Uint8Array<ArrayBuffer>;

const sha256 = async (label: string): Promise<Uint8Array> =>
  new Uint8Array(await crypto.subtle.digest('SHA-256', utf8(label)));

const importAesKey = async (raw: Uint8Array<ArrayBuffer>) =>
  crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, [
    'encrypt',
    'decrypt',
  ]);

const webCryptoRecordKey = async (root: Uint8Array<ArrayBuffer>) => {
  const material = await crypto.subtle.importKey('raw', root, 'HKDF', false, [
    'deriveBits',
  ]);
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: new Uint8Array(0),
      info: utf8(HKDF_RECORD_KEY_INFO),
    },
    material,
    PRF_LENGTH * 8,
  );
  return importAesKey(new Uint8Array(bits));
};

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

const fakeKeySource = () => {
  const handed: Uint8Array[] = [];
  const recordKey = importAesKey(rootOutput());
  const keySource = {
    ensureCredential: vi.fn(async () => {}),
    withSession: vi.fn(async (operation: () => Promise<unknown>) =>
      operation(),
    ),
    deviceSecret: vi.fn(async () => {
      const copy = deviceOutput();
      handed.push(copy);
      return copy;
    }),
    recordKey: vi.fn(async () => recordKey),
  };
  const authoriser = createPasskeyAuthoriser({
    keySource: keySource as unknown as PasskeySessionKeySource,
  });
  return { authoriser, keySource, handed };
};

type PrfResults = { first?: Uint8Array; second?: Uint8Array };

const assertionCredential = (rawId: ArrayBuffer, results?: PrfResults) =>
  ({
    rawId,
    getClientExtensionResults: () => (results ? { prf: { results } } : {}),
  } as unknown as Credential);

const creationCredential = (rawId: ArrayBuffer) =>
  ({
    rawId,
    getClientExtensionResults: () => ({ prf: { enabled: true } }),
  } as unknown as Credential);

const webAuthnSetup = () => {
  const createRawId = Uint8Array.from({ length: 16 }, () => 0xc0).buffer;
  const getRawId = Uint8Array.from({ length: 16 }, () => 0xa5).buffer;
  const returned: { first: Uint8Array; second: Uint8Array }[] = [];

  const create = vi.fn(async (_options?: CredentialCreationOptions) =>
    creationCredential(createRawId),
  );
  const get = vi.fn(async (_options?: CredentialRequestOptions) => {
    const outputs = { first: deviceOutput(), second: rootOutput() };
    returned.push(outputs);
    return assertionCredential(
      create.mock.calls.length ? createRawId : getRawId,
      outputs,
    );
  });

  const authoriser = createPasskeyAuthoriser({
    rpId: 'localhost',
    credentials: { create, get } as unknown as CredentialsContainer,
  });

  return { authoriser, create, get, returned, createRawId };
};

const cancellation = () =>
  Object.assign(new Error('The operation was cancelled.'), {
    name: 'NotAllowedError',
  });

describe('createPasskeyAuthoriser', () => {
  describe('over an injected key source', () => {
    it('implements the jubjub-schnorr scheme', () => {
      expect(fakeKeySource().authoriser.scheme).toBe('jubjub-schnorr');
    });

    it('reduces the device secret to the signing scalar of the signer math', async () => {
      const { authoriser } = fakeKeySource();
      await expect(authoriser.devicePublicKey()).resolves.toEqual(
        referenceDevice().pk,
      );
    });

    it('authorises an addDevice call with a verifiable challenge', async () => {
      const { authoriser } = fakeKeySource();
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
      const { authoriser } = fakeKeySource();
      await expect(
        authoriser.authorise({ ...addDeviceRequest, circuit: 'withdraw' }),
      ).rejects.toThrow(UnknownCircuitError);
    });

    it('asks the key source for the device secret on every authoriser call', async () => {
      const { authoriser, keySource } = fakeKeySource();
      await authoriser.devicePublicKey();
      await authoriser.devicePublicKey();
      expect(keySource.deviceSecret).toHaveBeenCalledTimes(2);
    });

    it('does not ask for the device secret when the signing modules fail to load', async () => {
      const { authoriser, keySource } = fakeKeySource();
      vi.mocked(loadJubjubSigning).mockRejectedValueOnce(
        new Error('chunk load failed'),
      );

      await expect(authoriser.devicePublicKey()).rejects.toThrow(
        'chunk load failed',
      );
      expect(keySource.deviceSecret).not.toHaveBeenCalled();
    });

    it('retries loading the signing modules after a failed load', async () => {
      const { authoriser } = fakeKeySource();
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

    it('computes a multi-counter commitment batch from a single device secret', async () => {
      const { authoriser, keySource } = fakeKeySource();
      const counters = [UseCounter(0n), UseCounter(1n), UseCounter(2n)];

      const batch = await authoriser.deviceCommitments(
        ACCOUNT,
        DeviceEpoch(0n),
        counters,
      );
      expect(keySource.deviceSecret).toHaveBeenCalledTimes(1);

      const perCall = [];
      for (const counter of counters) {
        perCall.push(
          await authoriser.deviceCommitment(ACCOUNT, DeviceEpoch(0n), counter),
        );
      }
      expect(batch).toEqual(perCall);
    });

    it('zeroes the device secret copy after a successful operation', async () => {
      const { authoriser, handed } = fakeKeySource();
      await authoriser.deviceCommitments(ACCOUNT, DeviceEpoch(0n), [
        UseCounter(0n),
        UseCounter(1n),
      ]);

      expect(handed).toHaveLength(1);
      expect(handed[0]).toEqual(zeroed());
    });

    it('zeroes the device secret copy when the operation fails', async () => {
      const { authoriser, handed } = fakeKeySource();
      await expect(
        authoriser.authorise({ ...addDeviceRequest, circuit: 'withdraw' }),
      ).rejects.toThrow(UnknownCircuitError);

      expect(handed).toHaveLength(1);
      expect(handed[0]).toEqual(zeroed());
    });

    it('propagates a cancelled ceremony from the key source', async () => {
      const { authoriser, keySource } = fakeKeySource();
      keySource.deviceSecret.mockRejectedValueOnce(
        new CeremonyCancelledError(),
      );
      await expect(authoriser.devicePublicKey()).rejects.toThrow(
        CeremonyCancelledError,
      );
    });

    it('maps passkey cancellation once and retains the original cause', async () => {
      const { authoriser, keySource } = fakeKeySource();
      const failure = new PasskeyCeremonyCancelledError();
      keySource.deviceSecret.mockRejectedValueOnce(failure);

      await expect(authoriser.devicePublicKey()).rejects.toMatchObject({
        code: 'ceremony-cancelled',
        cause: failure,
      });
    });

    it('exposes the record key of the key source as the storage key', async () => {
      const { authoriser, keySource } = fakeKeySource();
      await expect(authoriser.storageKey()).resolves.toBe(
        await keySource.recordKey(),
      );
    });

    it('runs a key session through the key source', async () => {
      const { authoriser, keySource } = fakeKeySource();
      const operation = vi.fn(async () => 7);

      await expect(authoriser.withKeySession(operation)).resolves.toBe(7);
      expect(keySource.withSession).toHaveBeenCalledExactlyOnceWith(operation);
    });

    it('delegates passkey enrolment to the key source', async () => {
      const { authoriser, keySource } = fakeKeySource();
      await authoriser.ensureCredential();
      expect(keySource.ensureCredential).toHaveBeenCalledOnce();
    });
  });

  describe('over a WebAuthn credentials container', () => {
    it('evaluates the PRF at the SHA-256 of both salt labels', async () => {
      const { authoriser, get } = webAuthnSetup();
      await authoriser.devicePublicKey();

      const evaluation = get.mock.calls[0][0]?.publicKey?.extensions?.prf?.eval;
      expect(evaluation?.first).toEqual(
        await sha256(PRF_SALT_AUTHORISER_LABEL),
      );
      expect(evaluation?.second).toEqual(await sha256(PRF_SALT_ROOT_LABEL));
    });

    it('reduces the authoriser-salt output to the signing scalar of the signer math', async () => {
      const { authoriser } = webAuthnSetup();
      await expect(authoriser.devicePublicKey()).resolves.toEqual(
        referenceDevice().pk,
      );
    });

    it('seals with a record key HKDF-derived from the storage-salt output', async () => {
      const { authoriser } = webAuthnSetup();
      const storageKey = await authoriser.storageKey();

      expect(storageKey.extractable).toBe(false);
      await expect(
        sealAndOpen(storageKey, await webCryptoRecordKey(rootOutput())),
      ).resolves.toBe('probe');
    });

    it('serves every authoriser call in a key session from one ceremony', async () => {
      const { authoriser, get } = webAuthnSetup();

      const inSession = await authoriser.withKeySession(async () => ({
        pk: await authoriser.devicePublicKey(),
        commitment: await authoriser.deviceCommitment(
          ACCOUNT,
          DeviceEpoch(0n),
          UseCounter(0n),
        ),
        authorisation: await authoriser.authorise(addDeviceRequest),
        storageKey: await authoriser.storageKey(),
      }));
      expect(get).toHaveBeenCalledOnce();

      expect(inSession.pk).toEqual(referenceDevice().pk);
      expect(inSession.authorisation.pk).toEqual(referenceDevice().pk);
      expect(inSession.storageKey).toBe(await authoriser.storageKey());
      expect(inSession.commitment).toBe(
        await authoriser.deviceCommitment(
          ACCOUNT,
          DeviceEpoch(0n),
          UseCounter(0n),
        ),
      );
    });

    it('zeroes both PRF outputs after the session settles', async () => {
      const { authoriser, returned } = webAuthnSetup();
      await authoriser.withKeySession(async () => {
        await authoriser.devicePublicKey();
        expect(returned[0].first).not.toEqual(zeroed());
      });

      expect(returned[0].first).toEqual(zeroed());
      expect(returned[0].second).toEqual(zeroed());
    });

    it('maps a dismissed assertion prompt to CeremonyCancelledError', async () => {
      const { authoriser, get } = webAuthnSetup();
      get.mockRejectedValueOnce(cancellation());
      await expect(authoriser.devicePublicKey()).rejects.toThrow(
        CeremonyCancelledError,
      );
    });

    it('pins the next ceremony to the created credential', async () => {
      const { authoriser, get, createRawId } = webAuthnSetup();
      await authoriser.ensureCredential();
      await authoriser.devicePublicKey();

      expect(get.mock.calls[0][0]?.publicKey?.allowCredentials).toEqual([
        { type: 'public-key', id: createRawId },
      ]);
    });
  });
});
