import { EntropyHex, Mnemonic } from '@lace-lib/crypto';
import { hkdf } from '@noble/hashes/hkdf';
import { sha256 } from '@noble/hashes/sha2';
import { bytesToHex } from '@noble/hashes/utils';

import { HKDF_WALLET_ENTROPY_INFO, PRF_SALT_ROOT_LABEL } from './constants';
import {
  PasskeyCeremonyCancelledError,
  PasskeyCredentialMismatchError,
  PasskeyPrfUnsupportedError,
} from './errors';

import type {
  CreatePasskeyKeySourceProps,
  PasskeyCredentialRef,
} from './key-source';

const DEFAULT_RP_NAME = 'Lace';
const CHALLENGE_LENGTH = 32;
const USER_ID_LENGTH = 16;
const WALLET_ENTROPY_LENGTH = 32;
// WebAuthn credential IDs have a maximum length of 1023 bytes.
const MAX_CREDENTIAL_ID_LENGTH = 1023;
const ES256 = -7;
const RS256 = -257;
const RECIPE_VERSION = 'v1';

const encodeId = (id: ArrayBuffer): string =>
  btoa(String.fromCharCode(...new Uint8Array(id)))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '');

const decodeId = (id: string): ArrayBuffer => {
  if (
    !/^[A-Za-z0-9_-]+$/.test(id) ||
    id.length > Math.ceil((MAX_CREDENTIAL_ID_LENGTH * 4) / 3)
  )
    throw new Error('Invalid passkey credential ID.');
  let bytes: Uint8Array<ArrayBuffer>;
  try {
    bytes = Uint8Array.from(
      atob(id.replaceAll('-', '+').replaceAll('_', '/')),
      character => character.charCodeAt(0),
    );
  } catch {
    throw new Error('Invalid passkey credential ID.');
  }
  if (bytes.length > MAX_CREDENTIAL_ID_LENGTH || encodeId(bytes.buffer) !== id)
    throw new Error('Invalid passkey credential ID.');
  return bytes.buffer;
};

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

/**
 * The PRF outputs of one assertion. `device` is present only when the
 * ceremonies evaluate a device salt.
 */
export type PrfOutputs = {
  device?: Uint8Array<ArrayBuffer>;
  root: Uint8Array<ArrayBuffer>;
};

type CredentialPin = {
  credentialId: ArrayBuffer;
  committed: boolean;
  holders: number;
};

/**
 * The caller's hold on the credential an assertion selected: `commit` keeps
 * a discovered credential pinned once its use succeeded, `release` ends the
 * hold, and a discovered credential nobody committed is forgotten.
 */
export type CredentialHolder = {
  commit: () => void;
  release: () => void;
};

/** The WebAuthn ceremonies of one passkey, before any derivation. */
export type PasskeyCeremonies = {
  ensureCredential: () => Promise<PasskeyCredentialRef>;
  credentialRef: () => PasskeyCredentialRef | undefined;
  /** One assertion; the caller zeroes the outputs and releases the holder. */
  ceremony: () => Promise<{
    outputs: PrfOutputs;
    credential: CredentialHolder;
  }>;
};

/** Zeroes every PRF output of one assertion. */
export const zeroOutputs = (outputs: PrfOutputs): void => {
  outputs.device?.fill(0);
  outputs.root.fill(0);
};

/**
 * The wallet entropy is HKDF-SHA256 over the root with an empty salt and a
 * fixed info label. The expanded bytes are zeroed once encoded; the hex
 * string is what leaves this function, and only for the caller's use.
 */
export const deriveWalletEntropy = (
  root: Uint8Array<ArrayBuffer>,
): EntropyHex => {
  const raw = hkdf(
    sha256,
    root,
    undefined,
    HKDF_WALLET_ENTROPY_INFO,
    WALLET_ENTROPY_LENGTH,
  );
  try {
    return EntropyHex(bytesToHex(raw));
  } finally {
    raw.fill(0);
  }
};

/**
 * Runs a fresh assertion and confines the words its root derives to `consume`.
 * The outputs are zeroed and the credential released on success and failure
 * alike; the credential is committed only when `consume` succeeds.
 */
export const withCeremonyMnemonic = async <T>(
  ceremony: PasskeyCeremonies['ceremony'],
  consume: (words: readonly string[]) => Promise<T>,
): Promise<T> => {
  const { outputs, credential } = await ceremony();
  try {
    const words = Mnemonic.deriveFrom(deriveWalletEntropy(outputs.root));
    const result = await consume(words);
    credential.commit();
    return result;
  } finally {
    credential.release();
    zeroOutputs(outputs);
  }
};

/**
 * The credential handling every key source shares: enrolment, the pinned
 * credential, and assertions evaluating the PRF at the root salt and, when
 * `deviceSaltLabel` is given, at that salt first. The root output is the
 * same either way, so every key source over one passkey derives the same
 * words.
 *
 * Ceremonies pin `allowCredentials` to the credential id captured from
 * passkey creation or a previous assertion; before one is known the key
 * is omitted, which is how WebAuthn asks for a discoverable credential,
 * so the browser offers any resident passkey for the origin. A dismissed
 * prompt maps to PasskeyCeremonyCancelledError and an authenticator without
 * PRF support to PasskeyPrfUnsupportedError.
 *
 * Enrolment asks for a platform authenticator, so the passkey is created
 * on the device the user is on and syncs through their platform
 * credential manager. Without that constraint a browser with no passkey
 * for the origin yet offers to scan a QR code and enrol another device
 * instead.
 */
export const createPasskeyCeremonies = (
  {
    credentials,
    rpName = DEFAULT_RP_NAME,
    rpId = globalThis.location?.hostname,
    credentialId: importedCredentialId,
  }: CreatePasskeyKeySourceProps,
  deviceSaltLabel?: string,
): PasskeyCeremonies => {
  if (!rpId) throw new Error('A passkey RP ID is required.');
  const container = credentials ?? navigator.credentials;

  let credentialPin: CredentialPin | undefined =
    importedCredentialId !== undefined
      ? {
          credentialId: decodeId(importedCredentialId),
          committed: true,
          holders: 0,
        }
      : undefined;

  const prfEval = async (): Promise<AuthenticationExtensionsPRFValues> => {
    const rootSalt = await prfSalt(PRF_SALT_ROOT_LABEL);
    return deviceSaltLabel === undefined
      ? { first: rootSalt }
      : { first: await prfSalt(deviceSaltLabel), second: rootSalt };
  };

  const toOutputs = (
    results: AuthenticationExtensionsPRFValues | undefined,
  ): PrfOutputs => {
    if (deviceSaltLabel === undefined) {
      if (!results?.first) throw new PasskeyPrfUnsupportedError();
      return { root: toBytes(results.first) };
    }
    if (!results?.first || !results.second) {
      throw new PasskeyPrfUnsupportedError();
    }
    return { device: toBytes(results.first), root: toBytes(results.second) };
  };

  const credentialRef = (): PasskeyCredentialRef | undefined =>
    credentialPin
      ? {
          credentialId: encodeId(credentialPin.credentialId),
          rpId,
          recipeVersion: RECIPE_VERSION,
        }
      : undefined;

  const releaseCredentialPin = (pin: CredentialPin): void => {
    pin.holders -= 1;
    if (!pin.committed && pin.holders === 0 && credentialPin === pin) {
      credentialPin = undefined;
    }
  };

  const createCredential = async (): Promise<PasskeyCredentialRef> => {
    const evaluation = await prfEval();

    let created: Credential | null;
    try {
      created = await container.create({
        publicKey: {
          rp: { name: rpName, id: rpId },
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
          extensions: { prf: { eval: evaluation } },
        },
      });
    } catch (error) {
      if (isCancellation(error)) throw new PasskeyCeremonyCancelledError();
      throw error;
    }
    if (!created) throw new PasskeyCeremonyCancelledError();

    const credential = created as PublicKeyCredential;
    if (!credential.getClientExtensionResults().prf?.enabled) {
      throw new PasskeyPrfUnsupportedError();
    }
    credentialPin = {
      credentialId: credential.rawId,
      committed: true,
      holders: 0,
    };
    return credentialRef()!;
  };

  let enrolment: Promise<PasskeyCredentialRef> | undefined;
  const ensureCredential = async (): Promise<PasskeyCredentialRef> => {
    const existing = credentialRef();
    if (existing) return existing;
    enrolment ??= createCredential().finally(() => {
      enrolment = undefined;
    });
    return enrolment;
  };

  const ceremony: PasskeyCeremonies['ceremony'] = async () => {
    const evaluation = await prfEval();
    const expectedPin = credentialPin;
    const expectedCredentialId = expectedPin?.credentialId;
    if (expectedPin) expectedPin.holders += 1;

    let asserted: Credential | null;
    try {
      asserted = await container.get({
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(CHALLENGE_LENGTH)),
          rpId,
          ...(expectedCredentialId && {
            allowCredentials: [
              { type: 'public-key', id: expectedCredentialId },
            ],
          }),
          userVerification: 'required',
          extensions: { prf: { eval: evaluation } },
        },
      });
    } catch (error) {
      if (expectedPin) releaseCredentialPin(expectedPin);
      if (isCancellation(error)) throw new PasskeyCeremonyCancelledError();
      throw error;
    }
    if (!asserted) {
      if (expectedPin) releaseCredentialPin(expectedPin);
      throw new PasskeyCeremonyCancelledError();
    }

    let heldPin = expectedPin;
    try {
      const credential = asserted as PublicKeyCredential;
      if (
        expectedCredentialId &&
        encodeId(credential.rawId) !== encodeId(expectedCredentialId)
      ) {
        throw new PasskeyCredentialMismatchError();
      }
      const outputs = toOutputs(
        credential.getClientExtensionResults().prf?.results,
      );

      if (!heldPin) {
        const currentPin = credentialPin;
        if (
          currentPin &&
          encodeId(credential.rawId) !== encodeId(currentPin.credentialId)
        ) {
          throw new PasskeyCredentialMismatchError();
        }
        if (currentPin) {
          currentPin.holders += 1;
          heldPin = currentPin;
        } else {
          heldPin = {
            credentialId: credential.rawId,
            committed: false,
            holders: 1,
          };
          credentialPin = heldPin;
        }
      }
      const selectedPin = heldPin;
      let isReleased = false;
      return {
        outputs,
        credential: {
          commit: () => {
            selectedPin.committed = true;
          },
          release: () => {
            if (isReleased) return;
            isReleased = true;
            releaseCredentialPin(selectedPin);
          },
        },
      };
    } catch (error) {
      if (heldPin) releaseCredentialPin(heldPin);
      throw error;
    }
  };

  return { ensureCredential, credentialRef, ceremony };
};
