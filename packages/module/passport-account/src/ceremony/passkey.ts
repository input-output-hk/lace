import {
  CeremonyCancelledError,
  PRF_SALT_AUTHORISER_LABEL,
  PRF_SALT_STORAGE_LABEL,
  PrfUnsupportedError,
} from '@lace-contract/passport';

import { loadJubjubSigning } from '../acc/signing-loader';

import type { JubjubAuthoriser } from '../acc/jubjub-authoriser';
import type { JubjubDevice } from '../acc/signer';
import type { PassportAuthoriser } from '@lace-contract/passport';

/**
 * A PassportAuthoriser whose keys come from the passkey PRF ceremony.
 * `ensureCredential` creates the resident passkey on first use;
 * `storageKey` exposes the AES-GCM key that seals the persisted account
 * record; `withKeySession` holds one ceremony open for a whole flow.
 */
export type PasskeyAuthoriser = PassportAuthoriser & {
  ensureCredential: () => Promise<void>;
  storageKey: () => Promise<CryptoKey>;
  withKeySession: <T>(operation: () => Promise<T>) => Promise<T>;
};

export type CreatePasskeyAuthoriserProps = {
  /** WebAuthn entry point; defaults to `navigator.credentials`. */
  credentials?: CredentialsContainer;
  /** Relying-party display name for the created passkey. */
  rpName?: string;
};

const DEFAULT_RP_NAME = 'Lace';
const CHALLENGE_LENGTH = 32;
const USER_ID_LENGTH = 16;
const ES256 = -7;
const RS256 = -257;

const utf8 = (value: string): Uint8Array<ArrayBuffer> =>
  new TextEncoder().encode(value) as Uint8Array<ArrayBuffer>;

/** PRF salts are public domain separators: SHA-256 of their label. */
const prfSalt = async (label: string): Promise<Uint8Array<ArrayBuffer>> =>
  new Uint8Array(await crypto.subtle.digest('SHA-256', utf8(label)));

const isCancellation = (error: unknown): boolean =>
  error instanceof Object &&
  'name' in error &&
  error.name === 'NotAllowedError';

const toBytes = (source: BufferSource): Uint8Array<ArrayBuffer> =>
  source instanceof ArrayBuffer
    ? new Uint8Array(source)
    : new Uint8Array(source.buffer, source.byteOffset, source.byteLength);

type PrfSecrets = {
  authoriser: Uint8Array<ArrayBuffer>;
  storage: Uint8Array<ArrayBuffer>;
};

type KeySession = {
  device: JubjubDevice;
  storageKey: CryptoKey;
  secrets: PrfSecrets;
};

const zeroSecrets = (secrets: PrfSecrets): void => {
  secrets.authoriser.fill(0);
  secrets.storage.fill(0);
};

/**
 * A {@link PasskeyAuthoriser} over the WebAuthn PRF extension, the
 * production key source for Passport accounts. Every ceremony evaluates
 * the PRF at two domain-separated salts: the authoriser output reduces to
 * the JubJub signing scalar, and the storage output imports as a
 * non-extractable AES-GCM key for the account record envelope.
 *
 * The signing key exists only for the duration of one operation. Outside
 * a key session that operation is a single authoriser call: it runs its
 * own ceremony, builds a fresh JubjubDevice, and zeroes the PRF outputs
 * afterwards, on success and failure alike. `withKeySession` widens it to
 * a whole flow: one ceremony serves every authoriser call the flow makes,
 * a session opened inside an open one joins it instead of prompting again,
 * and the device and the PRF outputs are dropped once the last flow
 * holding the session settles, on success and failure alike, so a joining
 * flow keeps its key material for as long as it runs. A batched
 * deviceCommitments call is one such ceremony for the whole batch, so an
 * unwrapped use-counter rescan prompts once per chunk of candidates
 * rather than once per candidate.
 * The storage key carries no signing authority and cannot be exported, so
 * it is cached across calls; it is derived in the same ceremony as a
 * signing use, so opening the sealed account record adds no extra prompt.
 *
 * Ceremonies pin `allowCredentials` to the credential id captured from
 * passkey creation or a previous assertion; before one is known the key
 * is omitted, which is how WebAuthn asks for a discoverable credential,
 * so the browser offers any resident passkey for the origin. A dismissed
 * prompt maps to CeremonyCancelledError and an authenticator without PRF
 * support to PrfUnsupportedError.
 *
 * Enrolment asks for a platform authenticator, so the passkey is created
 * on the device the user is on and syncs through their platform
 * credential manager. Without that constraint a browser with no passkey
 * for the origin yet offers to scan a QR code and enrol another device
 * instead, which is a different account-recovery story than the one this
 * module is built around.
 */
export const createPasskeyAuthoriser = ({
  credentials,
  rpName = DEFAULT_RP_NAME,
}: CreatePasskeyAuthoriserProps = {}): PasskeyAuthoriser => {
  const container = credentials ?? navigator.credentials;

  let credentialId: ArrayBuffer | undefined;
  let cachedStorageKey: CryptoKey | undefined;
  let session: Promise<KeySession> | undefined;
  let sessionHolders = 0;

  const salts = async () =>
    Promise.all([
      prfSalt(PRF_SALT_AUTHORISER_LABEL),
      prfSalt(PRF_SALT_STORAGE_LABEL),
    ]);

  const ensureCredential = async (): Promise<void> => {
    if (credentialId) return;
    const [authoriserSalt, storageSalt] = await salts();

    let created: Credential | null;
    try {
      created = await container.create({
        publicKey: {
          rp: { name: rpName },
          user: {
            id: crypto.getRandomValues(new Uint8Array(USER_ID_LENGTH)),
            name: rpName,
            displayName: rpName,
          },
          challenge: crypto.getRandomValues(new Uint8Array(CHALLENGE_LENGTH)),
          pubKeyCredParams: [
            { type: 'public-key', alg: ES256 },
            { type: 'public-key', alg: RS256 },
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            residentKey: 'required',
            userVerification: 'required',
          },
          extensions: {
            prf: { eval: { first: authoriserSalt, second: storageSalt } },
          },
        },
      });
    } catch (error) {
      if (isCancellation(error)) throw new CeremonyCancelledError();
      throw error;
    }
    if (!created) throw new CeremonyCancelledError();

    const credential = created as PublicKeyCredential;
    if (!credential.getClientExtensionResults().prf?.enabled) {
      throw new PrfUnsupportedError();
    }
    credentialId = credential.rawId;
  };

  const ceremony = async (): Promise<PrfSecrets> => {
    const [authoriserSalt, storageSalt] = await salts();

    let asserted: Credential | null;
    try {
      asserted = await container.get({
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(CHALLENGE_LENGTH)),
          ...(credentialId && {
            allowCredentials: [{ type: 'public-key', id: credentialId }],
          }),
          userVerification: 'required',
          extensions: {
            prf: { eval: { first: authoriserSalt, second: storageSalt } },
          },
        },
      });
    } catch (error) {
      if (isCancellation(error)) throw new CeremonyCancelledError();
      throw error;
    }
    if (!asserted) throw new CeremonyCancelledError();

    const credential = asserted as PublicKeyCredential;
    const results = credential.getClientExtensionResults().prf?.results;
    if (!results?.first || !results.second) throw new PrfUnsupportedError();

    credentialId = credential.rawId;
    return {
      authoriser: toBytes(results.first),
      storage: toBytes(results.second),
    };
  };

  const openSession = async (): Promise<KeySession> => {
    const signing = await loadJubjubSigning();
    const secrets = await ceremony();
    try {
      const storageKey = await crypto.subtle.importKey(
        'raw',
        secrets.storage,
        { name: 'AES-GCM' },
        false,
        ['encrypt', 'decrypt'],
      );
      cachedStorageKey = storageKey;
      const device = new signing.JubjubDevice(
        signing.bytesToBigIntLE(secrets.authoriser) % signing.JUBJUB_R,
      );
      return { device, storageKey, secrets };
    } catch (error) {
      zeroSecrets(secrets);
      throw error;
    }
  };

  const runCeremony = async <T>(
    operation: (device: JubjubDevice, storageKey: CryptoKey) => T,
  ): Promise<T> => {
    if (session) {
      const active = await session;
      return operation(active.device, active.storageKey);
    }
    const opened = await openSession();
    try {
      return operation(opened.device, opened.storageKey);
    } finally {
      zeroSecrets(opened.secrets);
    }
  };

  const withKeySession = async <T>(operation: () => Promise<T>): Promise<T> => {
    const opening = (session ??= openSession());
    sessionHolders += 1;
    let opened: KeySession | undefined;
    try {
      opened = await opening;
      return await operation();
    } finally {
      sessionHolders -= 1;
      if (sessionHolders === 0) {
        if (opened) zeroSecrets(opened.secrets);
        session = undefined;
      }
    }
  };

  let jubjubAuthoriser: Promise<JubjubAuthoriser> | undefined;
  const authoriser = async (): Promise<JubjubAuthoriser> => {
    jubjubAuthoriser ??= loadJubjubSigning().then(
      ({ createJubjubAuthoriser }) => createJubjubAuthoriser(runCeremony),
    );
    jubjubAuthoriser.catch(() => {
      jubjubAuthoriser = undefined;
    });
    return jubjubAuthoriser;
  };

  return {
    scheme: 'jubjub-schnorr',
    deviceCommitment: async (account, epoch, counter) =>
      (await authoriser()).deviceCommitment(account, epoch, counter),
    deviceCommitments: async (account, epoch, counters) =>
      (await authoriser()).deviceCommitments(account, epoch, counters),
    devicePublicKey: async () => (await authoriser()).devicePublicKey(),
    authorise: async request => (await authoriser()).authorise(request),
    ensureCredential,
    storageKey: async () =>
      cachedStorageKey ?? runCeremony((_device, storageKey) => storageKey),
    withKeySession,
  };
};
