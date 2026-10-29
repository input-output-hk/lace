import {
  combineContracts,
  inferModuleContext,
  ModuleName,
} from '@lace-contract/module';
import { signerFactoryAddonContract } from '@lace-contract/signer';

import {
  CardanoRemoteSignerFactory,
  type RemoteSignerRequester,
} from './cardano-remote-signer-factory';

/** The options of `createRemoteCardanoVaultModule`. */
export type CreateRemoteCardanoVaultModuleProps = {
  /** Connected signer client; every signature is one request on it. */
  client: RemoteSignerRequester;
};

/**
 * Builds a vault module that signs for
 * {@link WalletType.LazyInMemory} Cardano accounts through the Lace signer
 * page instead of a local mnemonic. Pass the returned module to
 * `createLaceWallet({ modules: [...] })`. Only the `signer-factory-addon`
 * contract is implemented, as with the local lazy vault: the SDK has no
 * encrypted vault to expose. A `RemotePasskeySigner` carries one ready-made,
 * as `cardanoVaultModule`.
 *
 * @param props - The connected signer client.
 * @returns A module for the `modules` array of `createLaceWallet`.
 */
export const createRemoteCardanoVaultModule = (
  props: CreateRemoteCardanoVaultModuleProps,
) => {
  const signerFactory = new CardanoRemoteSignerFactory(props);

  const implementsContracts = combineContracts([
    signerFactoryAddonContract,
  ] as const);

  return inferModuleContext({
    moduleName: ModuleName('remote-cardano-vault'),
    implements: implementsContracts,
    addons: {
      loadSignerFactory: async () => ({ default: () => signerFactory }),
    },
  });
};
