import { deriveSymmetricSecret, Mnemonic } from '@lace-lib/crypto';
import { hkdf } from '@noble/hashes/hkdf';
import { sha256 } from '@noble/hashes/sha2';

import {
  createPasskeyCeremonies,
  deriveWalletEntropy,
  withCeremonyMnemonic,
  zeroOutputs,
} from './ceremony';
import { HKDF_RECORD_KEY_INFO, PRF_SALT_AUTHORISER_LABEL } from './constants';

import type { PrfOutputs } from './ceremony';
import type {
  CreatePasskeyKeySourceProps,
  PasskeyKeySource,
} from './key-source';

/**
 * A {@link PasskeyKeySource} that also serves Passport account flows.
 * `deviceSecret` hands out the device secret for the caller to reduce to its
 * signing key; `recordKey` exposes the AES-GCM key that seals the persisted
 * account record; `deriveSecret` derives a domain-scoped secret.
 * `withSession` holds one ceremony open for a flow.
 */
export type PasskeySessionKeySource = PasskeyKeySource & {
  withSession: <T>(operation: () => Promise<T>) => Promise<T>;
  /**
   * A copy of the device secret, owned by the caller, who zeroes it once
   * the signing key is built from it.
   */
  deviceSecret: () => Promise<Uint8Array>;
  recordKey: () => Promise<CryptoKey>;
  deriveSecret: (
    params: Parameters<typeof deriveSymmetricSecret>[1],
  ) => Promise<Uint8Array>;
};

const RECORD_KEY_LENGTH = 32;

type KeySession = {
  outputs: Required<PrfOutputs>;
  recordKey: CryptoKey;
};

/**
 * The record key is HKDF-SHA256 over the root with an empty salt and a
 * fixed info label, imported as a non-extractable AES-GCM key. The
 * expanded bytes are zeroed once imported: the CryptoKey is the only form
 * that leaves this function.
 */
const deriveRecordKey = async (
  root: Uint8Array<ArrayBuffer>,
): Promise<CryptoKey> => {
  const raw = hkdf(
    sha256,
    root,
    undefined,
    HKDF_RECORD_KEY_INFO,
    RECORD_KEY_LENGTH,
  ) as Uint8Array<ArrayBuffer>;
  try {
    return await crypto.subtle.importKey(
      'raw',
      raw,
      { name: 'AES-GCM' },
      false,
      ['encrypt', 'decrypt'],
    );
  } finally {
    raw.fill(0);
  }
};

/**
 * Creates the key source Passport account flows build on: the accessors of
 * `createPasskeyKeySource` plus `withSession`, `deriveSecret`, `deviceSecret`
 * and `recordKey`, without ever handing out the root they come from.
 * `deviceSecret` returns a caller-owned copy of the device secret, the first
 * PRF output, which the caller zeroes after use; `recordKey` returns the
 * non-extractable AES-GCM `CryptoKey` that seals the persisted account record.
 *
 * @remarks
 * Every ceremony evaluates the PRF at two domain-separated salts: the first
 * output is the device secret and the second is the root. The root never
 * leaves this library; the record key is one HKDF derivation from it, and
 * further named derivations fan out from the same root without any of them
 * being able to reach it or each other. The root salt is the one
 * `createPasskeyKeySource` evaluates, so both derive the same words from one
 * passkey.
 *
 * Both outputs exist only while someone holds the session. Outside a
 * session that holder is an accessor call: it runs its own
 * ceremony and zeroes both outputs afterwards, on success and failure
 * alike. `withSession` widens it to a whole flow: one ceremony serves
 * every accessor call the flow makes, a session opened inside an open one
 * joins it instead of prompting again, and the outputs are zeroed once
 * the last holder settles, on success and failure alike. An accessor
 * call joining an open session counts as a holder in its own right, so a
 * flow that settles while one is still running cannot pull the outputs
 * from under it.
 *
 * The record key carries no signing authority and cannot be exported, so
 * it is cached across calls; it is derived in the same ceremony as a
 * device-secret access, so opening the sealed account record adds no
 * extra prompt. Wallet signing always makes a separate assertion; its
 * entropy is derived on demand and never kept.
 *
 * @param props - The relying party, a saved credential ID and the WebAuthn
 *   entry point, each optional.
 */
export const createPasskeySessionKeySource = (
  props: CreatePasskeyKeySourceProps = {},
): PasskeySessionKeySource => {
  const { ensureCredential, credentialRef, ceremony } = createPasskeyCeremonies(
    props,
    PRF_SALT_AUTHORISER_LABEL,
  );

  let cachedRecordKey: CryptoKey | undefined;
  let session: Promise<KeySession> | undefined;
  let sessionHolders = 0;

  const openSession = async (): Promise<KeySession> => {
    const { outputs, credential } = await ceremony();
    try {
      const recordKey =
        cachedRecordKey ?? (await deriveRecordKey(outputs.root));
      cachedRecordKey = recordKey;
      credential.commit();
      return { outputs: outputs as Required<PrfOutputs>, recordKey };
    } catch (error) {
      zeroOutputs(outputs);
      throw error;
    } finally {
      credential.release();
    }
  };

  const holdSession = async <T>(
    operation: (keys: KeySession) => Promise<T>,
  ): Promise<T> => {
    const opening = (session ??= openSession());
    sessionHolders += 1;
    let opened: KeySession | undefined;
    try {
      opened = await opening;
      return await operation(opened);
    } finally {
      sessionHolders -= 1;
      if (sessionHolders === 0) {
        if (opened) zeroOutputs(opened.outputs);
        session = undefined;
      }
    }
  };

  const withSession = async <T>(operation: () => Promise<T>): Promise<T> =>
    holdSession(async () => operation());

  return {
    ensureCredential,
    credentialRef,
    withSession,
    deviceSecret: async () =>
      holdSession(async ({ outputs }) => outputs.device.slice()),
    recordKey: async () =>
      cachedRecordKey ?? holdSession(async ({ recordKey }) => recordKey),
    deriveSecret: async params =>
      holdSession(async ({ outputs }) => {
        const seed = Mnemonic.toSeed(
          Mnemonic.deriveFrom(deriveWalletEntropy(outputs.root)),
        );
        try {
          return deriveSymmetricSecret(seed, params);
        } finally {
          seed.fill(0);
        }
      }),
    // Wallet signing never borrows Passport's open session. Each call asks
    // the authenticator again, including calls inside withSession.
    withPasskeyMnemonic: async use => withCeremonyMnemonic(ceremony, use),
  };
};
