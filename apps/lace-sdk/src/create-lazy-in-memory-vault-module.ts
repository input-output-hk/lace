import {
  combineContracts,
  inferModuleContext,
  ModuleName,
} from '@lace-contract/module';
import { signerFactoryAddonContract } from '@lace-contract/signer';

import {
  CardanoLazyInMemorySignerFactory,
  type GetMnemonicWords,
} from './cardano-lazy-in-memory-signer-factory';

export type CreateLazyInMemoryVaultModuleProps = {
  /**
   * Resolves the BIP-39 mnemonic for the requested account on every sign call.
   *
   * The SDK never persists the returned words: they are fed into a fresh
   * in-memory key agent that is discarded as soon as the sign call completes,
   * keeping the seed exclusively in the caller's key-management service
   * (e.g. Torus / Web3Auth).
   */
  getMnemonicWords: GetMnemonicWords;
};

/**
 * Builds a {@link LaceModuleMap} that supplies a Cardano signer factory for
 * {@link WalletType.LazyInMemory} accounts.
 *
 * Pass the returned map to `createLaceWallet({ modules: [...] })`. Only the
 * `signer-factory-addon` contract is implemented — `vaultContract` is
 * intentionally omitted because the SDK has no encrypted vault to expose to
 * features such as account management or password verification.
 */
export const createLazyInMemoryVaultModule = ({
  getMnemonicWords,
}: CreateLazyInMemoryVaultModuleProps) => {
  const signerFactory = new CardanoLazyInMemorySignerFactory({
    getMnemonicWords,
  });

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
