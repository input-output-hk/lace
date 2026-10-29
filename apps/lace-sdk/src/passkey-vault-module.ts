import { createLazyInMemoryVaultModule } from './create-lazy-in-memory-vault-module';

import type { PasskeyKeySource } from '@lace-lib/passkey';

/**
 * A lazy vault module whose recovery words come from a fresh assertion of a
 * passkey at each signature: the words derive from the passkey and are
 * checked against the account's stored key before anything is signed. The
 * assertion stays open until the Cardano signature completes.
 *
 * @param props - The passkey.
 * @returns A module for the `modules` array of `createLaceWallet`.
 */
export const createPasskeyVaultModule = ({
  keySource,
}: {
  /** The passkey's key source, from `createPasskeyKeySource`. */
  keySource: PasskeyKeySource;
}) =>
  createLazyInMemoryVaultModule({
    withMnemonicWords: async use => keySource.withPasskeyMnemonic(use),
  });
