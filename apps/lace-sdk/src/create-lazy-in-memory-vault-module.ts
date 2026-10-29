import {
  combineContracts,
  inferModuleContext,
  ModuleName,
} from '@lace-contract/module';
import { signerFactoryAddonContract } from '@lace-contract/signer';

import {
  CardanoLazyInMemorySignerFactory,
  type WithMnemonicWords,
} from './cardano-lazy-in-memory-signer-factory';

/** The options of `createLazyInMemoryVaultModule`. */
export type CreateLazyInMemoryVaultModuleProps = {
  /**
   * Supplies the recovery words for one signature: call `use(words)` and
   * await it, so the words stay inside the callback until signing finishes.
   */
  withMnemonicWords: WithMnemonicWords;
};

/**
 * Builds a vault module that signs for {@link WalletType.LazyInMemory}
 * Cardano accounts by asking `withMnemonicWords` for the recovery words at
 * each signature. The words must derive the account's stored key, or signing
 * fails with `LazyWalletMismatchError`.
 *
 * Pass the returned module to `createLaceWallet({ modules: [...] })`. Only the
 * `signer-factory-addon` contract is implemented — `vaultContract` is
 * intentionally omitted because the SDK has no encrypted vault to expose to
 * features such as account management or password verification.
 *
 * @param props - The source of the recovery words.
 * @returns A module for the `modules` array of `createLaceWallet`.
 */
export const createLazyInMemoryVaultModule = (
  props: CreateLazyInMemoryVaultModuleProps,
) => {
  const signerFactory = new CardanoLazyInMemorySignerFactory(props);

  const implementsContracts = combineContracts([
    signerFactoryAddonContract,
  ] as const);

  return inferModuleContext({
    moduleName: ModuleName('lazy-in-memory-vault'),
    implements: implementsContracts,
    addons: {
      loadSignerFactory: async () => ({ default: () => signerFactory }),
    },
  });
};
