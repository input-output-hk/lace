import { createPasskeySessionKeySource } from '@lace-lib/passkey';

import { loadJubjubSigning } from '../acc/signing-loader';

import { asPassport } from './passkey-errors';

import type {
  JubjubAuthoriser,
  JubjubDeviceRunner,
} from '../acc/jubjub-authoriser';
import type {
  CreatePasskeyKeySourceProps,
  PasskeySessionKeySource,
} from '@lace-lib/passkey';

/**
 * A PassportAuthoriser whose keys come from the passkey PRF ceremony.
 * `ensureCredential` creates the resident passkey on first use;
 * `storageKey` exposes the AES-GCM key that seals the persisted account
 * record; `withKeySession` holds one ceremony open for a whole flow. The
 * batched `deviceCommitments` lookup is always implemented.
 */
export type PasskeyAuthoriser = JubjubAuthoriser & {
  ensureCredential: () => Promise<void>;
  storageKey: () => Promise<CryptoKey>;
  withKeySession: <T>(operation: () => Promise<T>) => Promise<T>;
};

/**
 * Either a key source to build on, so one passkey can serve the
 * authoriser and other consumers of the same root, or the WebAuthn
 * options from which the authoriser creates its own.
 */
export type CreatePasskeyAuthoriserProps =
  | { keySource: PasskeySessionKeySource }
  | (CreatePasskeyKeySourceProps & { keySource?: undefined });

const toKeySource = (
  props: CreatePasskeyAuthoriserProps,
): PasskeySessionKeySource =>
  props.keySource === undefined
    ? createPasskeySessionKeySource(props)
    : props.keySource;

/**
 * A {@link PasskeyAuthoriser} over a {@link PasskeySessionKeySource}, the
 * production key source for Passport accounts. The device secret the
 * source hands out reduces to the JubJub signing scalar; the record key
 * it derives seals the account record envelope.
 *
 * The signing key exists only for the duration of one operation. Each
 * authoriser call asks the source for a copy of the device secret, builds
 * a fresh JubjubDevice from it and zeroes the copy afterwards, on success
 * and failure alike. Outside a key session that call is a ceremony of its
 * own; inside one, every call is served from the session the source holds
 * open, so a whole flow prompts once. A batched deviceCommitments call is
 * one such operation for the whole batch, so an unwrapped use-counter
 * rescan prompts once per chunk of candidates rather than once per
 * candidate. Session semantics, credential pinning and the mapping of a
 * dismissed prompt or a PRF-less authenticator to their errors are the
 * key source's.
 */
export const createPasskeyAuthoriser = (
  props: CreatePasskeyAuthoriserProps = {},
): PasskeyAuthoriser => {
  const keySource = toKeySource(props);

  const runWithDevice: JubjubDeviceRunner = async operation => {
    const signing = await loadJubjubSigning();
    const secret = await asPassport(keySource.deviceSecret);
    try {
      const device = new signing.JubjubDevice(
        signing.bytesToBigIntLE(secret) % signing.JUBJUB_R,
      );
      return operation(device);
    } finally {
      secret.fill(0);
    }
  };

  let jubjubAuthoriser: Promise<JubjubAuthoriser> | undefined;
  const authoriser = async (): Promise<JubjubAuthoriser> => {
    jubjubAuthoriser ??= loadJubjubSigning().then(
      ({ createJubjubAuthoriser }) => createJubjubAuthoriser(runWithDevice),
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
    ensureCredential: async () => {
      await asPassport(keySource.ensureCredential);
    },
    storageKey: async () => asPassport(keySource.recordKey),
    withKeySession: async operation =>
      asPassport(async () => keySource.withSession(operation)),
  };
};
