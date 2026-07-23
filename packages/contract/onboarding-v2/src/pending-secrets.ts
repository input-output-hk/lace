import { AuthSecret } from '@lace-contract/authentication-prompt';
import { ByteArray } from '@lace-lib/util';
import { BehaviorSubject } from 'rxjs';

/**
 * Plaintext secrets staged while the user moves through the onboarding
 * create/restore screens.
 *
 * These live in a module-scoped in-memory buffer rather than in Redux state.
 * Staging plaintext password/recovery phrase in the global, serialised,
 * dev-tool-observable store widens the exposure surface (LW-14498). This buffer
 * keeps the secrets in the UI process only, off the action log and out of every
 * selector, and is cleared on completion/cancellation/failure.
 *
 * The password is held as an AuthSecret (a redacted, zeroable byte array): it
 * renders as [REDACTED] if ever logged and is wiped in place on clear/replace
 * rather than left for the garbage collector. It is decoded back to a string
 * only at the moment it is dispatched to the service worker.
 */
export type PendingCreateWalletSecrets = {
  password?: AuthSecret;
  recoveryPhrase?: string[];
};

type PendingCreateWalletSecretsInput = {
  password?: string;
  recoveryPhrase?: string[];
};

const EMPTY_SECRETS: PendingCreateWalletSecrets = Object.freeze({});

const secrets$ = new BehaviorSubject<PendingCreateWalletSecrets>(EMPTY_SECRETS);

/**
 * Merge secrets into the buffer. A provided password is encoded to an
 * AuthSecret and any previous password is wiped. An empty result collapses to a
 * shared empty object so subscribers observe a stable reference.
 */
export const setPendingCreateWalletSecrets = (
  partial: Readonly<PendingCreateWalletSecretsInput>,
): void => {
  const current = secrets$.getValue();

  let password = current.password;
  if ('password' in partial) {
    current.password?.fill(0);
    password =
      partial.password === undefined
        ? undefined
        : AuthSecret.fromUTF8(partial.password);
  }

  const recoveryPhrase =
    'recoveryPhrase' in partial
      ? partial.recoveryPhrase
      : current.recoveryPhrase;

  const next: PendingCreateWalletSecrets = {};
  if (password !== undefined) next.password = password;
  if (recoveryPhrase !== undefined) next.recoveryPhrase = recoveryPhrase;

  secrets$.next(Object.keys(next).length > 0 ? next : EMPTY_SECRETS);
};

export const clearPendingCreateWalletSecrets = (): void => {
  const current = secrets$.getValue();
  if (current === EMPTY_SECRETS) return;
  current.password?.fill(0);
  secrets$.next(EMPTY_SECRETS);
};

/** Current staged secrets. Reference is stable until the buffer changes. */
export const getPendingCreateWalletSecretsSnapshot =
  (): PendingCreateWalletSecrets => secrets$.getValue();

/** Decode the staged password to a string for dispatch to the service worker. */
export const getPendingCreateWalletPasswordUtf8 = (): string | undefined => {
  const { password } = secrets$.getValue();
  return password === undefined ? undefined : ByteArray.toUTF8(password);
};

/** Subscribe to buffer changes. Pairs with useSyncExternalStore. */
export const subscribePendingCreateWalletSecrets = (
  listener: () => void,
): (() => void) => {
  const subscription = secrets$.subscribe(() => {
    listener();
  });
  return () => {
    subscription.unsubscribe();
  };
};
