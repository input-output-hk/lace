import {
  combineContracts,
  inferModuleContext,
  ModuleName,
} from '@lace-contract/module';
import { signerFactoryAddonContract } from '@lace-contract/signer';

import { BitcoinLazyInMemorySignerFactory } from './bitcoin-lazy-in-memory-signer-factory';

import type { WithMnemonicWords } from '../cardano-lazy-in-memory-signer-factory';

/** The options of `createBitcoinLazyInMemoryVaultModule`. */
export type CreateBitcoinLazyInMemoryVaultModuleProps = {
  /**
   * Supplies the recovery words for one signature: call `use(words)` and
   * await it, so the words stay inside the callback until signing finishes.
   */
  withMnemonicWords: WithMnemonicWords;
};

/**
 * Builds a vault module that signs for {@link WalletType.LazyInMemory}
 * Bitcoin accounts by asking `withMnemonicWords` for the recovery words at
 * each signature. The words must derive the account's stored extended public
 * keys, or signing fails with `LazyWalletMismatchError`. The seed derived
 * from the words is wiped once each signature settles. Only transactions are
 * signed: lazy Bitcoin accounts do not sign messages.
 *
 * Pass the returned module to `createLaceWallet({ modules: [...] })`. Only the
 * `signer-factory-addon` contract is implemented, because the SDK has no
 * encrypted vault to expose to features such as account management or
 * password verification.
 *
 * @param props - The source of the recovery words.
 * @returns A module for the `modules` array of `createLaceWallet`.
 */
export const createBitcoinLazyInMemoryVaultModule = (
  props: CreateBitcoinLazyInMemoryVaultModuleProps,
) => {
  const signerFactory = new BitcoinLazyInMemorySignerFactory(props);

  const implementsContracts = combineContracts([
    signerFactoryAddonContract,
  ] as const);

  return inferModuleContext({
    moduleName: ModuleName('bitcoin-lazy-in-memory-vault'),
    implements: implementsContracts,
    addons: {
      loadSignerFactory: async () => ({ default: () => signerFactory }),
    },
  });
};
