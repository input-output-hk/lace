import { createPasskeyCeremonies, withCeremonyMnemonic } from './ceremony';

/** The public reference to a key source's passkey, safe to persist. */
export type PasskeyCredentialRef = {
  /** The credential ID, base64url. */
  credentialId: string;
  /** The relying-party ID the passkey is scoped to. */
  rpId: string;
  /** The version of the derivation recipe. */
  recipeVersion: 'v1';
};

/**
 * The wallet one passkey derives. `ensureCredential` creates the resident
 * passkey on first use, `credentialRef` names the passkey once one is known,
 * and `withPasskeyMnemonic` runs a fresh assertion and confines the
 * recovery words it derives to a callback.
 */
export type PasskeyKeySource = {
  ensureCredential: () => Promise<PasskeyCredentialRef>;
  credentialRef: () => PasskeyCredentialRef | undefined;
  /**
   * Derive words within a fresh assertion. Callers must not return or retain
   * the words from the callback.
   */
  withPasskeyMnemonic: <T>(
    use: (words: readonly string[]) => Promise<T>,
  ) => Promise<T>;
};

/** The options of `createPasskeyKeySource`, each optional. */
export type CreatePasskeyKeySourceProps = {
  /** WebAuthn entry point; defaults to `navigator.credentials`. */
  credentials?: CredentialsContainer;
  /** Relying-party display name for the created passkey. */
  rpName?: string;
  /** Explicit relying-party ID; defaults to the current origin's hostname. */
  rpId?: string;
  /** Base64url credential ID from a previous credentialRef(). */
  credentialId?: string;
};

/**
 * Creates the key source of one passkey: it runs the WebAuthn PRF ceremony
 * and derives the passkey's wallet words, handing them only to the callback
 * of `withPasskeyMnemonic`.
 *
 * @remarks
 * A {@link PasskeyKeySource} over the WebAuthn PRF extension. Each call to
 * `withPasskeyMnemonic` is its own assertion: the PRF output is the root,
 * the words derive from it through HKDF and BIP-39, and the root is zeroed
 * once the callback settles, on success and failure alike. Nothing is kept
 * between calls except the credential id.
 *
 * Ceremonies pin `allowCredentials` to the credential id captured from
 * passkey creation or a previous assertion; before one is known the key is
 * omitted, so the browser offers any resident passkey for the origin. A
 * dismissed prompt rejects with a `ceremony-cancelled` error and an
 * authenticator without PRF support with a `prf-unsupported` one.
 *
 * Enrolment asks for a platform authenticator, so the passkey is created on
 * the device the user is on and syncs through their platform credential
 * manager. Without that constraint a browser with no passkey for the origin
 * yet offers to scan a QR code and enrol another device instead.
 *
 * @param props - The relying party, a saved credential ID and the WebAuthn
 *   entry point, each optional.
 */
export const createPasskeyKeySource = (
  props: CreatePasskeyKeySourceProps = {},
): PasskeyKeySource => {
  const { ensureCredential, credentialRef, ceremony } =
    createPasskeyCeremonies(props);
  return {
    ensureCredential,
    credentialRef,
    withPasskeyMnemonic: async use => withCeremonyMnemonic(ceremony, use),
  };
};
