import { BehaviorSubject } from 'rxjs';

/**
 * Plaintext recovery phrase staged while the user moves through the restore
 * wallet sheets (enter phrase -> select blockchains -> create).
 *
 * Kept in a module-scoped in-memory buffer rather than Redux state so the
 * phrase stays in the UI process only, off the action log and out of every
 * selector (LW-14498). It is cleared on completion/cancellation/failure. The
 * phrase still travels through the attemptCreateWallet action payload so the
 * service-worker side effect can consume it once, but is never written to the
 * store.
 */
export type RestoreWalletSecrets = {
  recoveryPhrase?: string[];
};

const EMPTY_SECRETS: RestoreWalletSecrets = Object.freeze({});

const secrets$ = new BehaviorSubject<RestoreWalletSecrets>(EMPTY_SECRETS);

export const setRestoreWalletSecrets = (
  partial: Readonly<Partial<RestoreWalletSecrets>>,
): void => {
  const merged = { ...secrets$.getValue(), ...partial };

  const next = Object.fromEntries(
    Object.entries(merged).filter(([, value]) => value !== undefined),
  ) as RestoreWalletSecrets;

  secrets$.next(Object.keys(next).length > 0 ? next : EMPTY_SECRETS);
};

export const clearRestoreWalletSecrets = (): void => {
  if (secrets$.getValue() !== EMPTY_SECRETS) {
    secrets$.next(EMPTY_SECRETS);
  }
};

/** Current staged secrets. Reference is stable until the buffer changes. */
export const getRestoreWalletSecretsSnapshot = (): RestoreWalletSecrets =>
  secrets$.getValue();

/** Subscribe to buffer changes. Pairs with useSyncExternalStore. */
export const subscribeRestoreWalletSecrets = (
  listener: () => void,
): (() => void) => {
  const subscription = secrets$.subscribe(() => {
    listener();
  });
  return () => {
    subscription.unsubscribe();
  };
};
