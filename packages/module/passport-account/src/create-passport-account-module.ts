import {
  combineContracts,
  inferModuleContext,
  inferStoreContext,
  ModuleName,
} from '@lace-contract/module';
import {
  passportActions,
  passportDependencyContract,
  passportSelectors,
  passportStoreContract,
} from '@lace-contract/passport';

import { validatePassportNetwork } from './infra/networks';

import type { AccountRecordStore } from './store/account-record';
import type {
  FeeSponsor,
  PassportAuthoriser,
  PassportEncryptionKey,
  PassportNetworkConfig,
  PassportProver,
} from '@lace-contract/passport';

/** The seams of `createPassportAccountModule`. */
export type CreatePassportAccountModuleProps = {
  /** Signs device operations with the device's passkey-derived key. */
  authoriser: PassportAuthoriser;
  /** Resolves the account's public encryption key. */
  encryptionKey: PassportEncryptionKey;
  /** Pays every Passport transaction's fee. */
  sponsor: FeeSponsor;
  /** Proves the contract's circuit calls. */
  prover: PassportProver;
  /** The Midnight network ID, and the indexer, node and artefact endpoints. */
  network: PassportNetworkConfig;
  /**
   * Where the flows keep the account record. Defaults to the platform
   * key-value storage, sealed by the authoriser's storage key; a host
   * whose record lives elsewhere, such as with a remote signer, supplies
   * its own store. The startup restore still peeks the platform storage
   * without a key, so a host that once ran a local authoriser may
   * rehydrate a stale local record while its flows use this store.
   */
  accountRecordStore?: AccountRecordStore;
  /**
   * The relying party id of the host, which every grant it issues is
   * bound to through the grant id's origin hash. Defaults to the page's
   * hostname; a host without one, such as a native shell, must supply
   * it before it can issue grants.
   */
  rpId?: string;
};

/**
 * Builds the Passport account module for the given platform capabilities:
 * the device authoriser, the encryption key, fee sponsor, prover, the
 * Midnight network endpoints and the host's relying party id. Implements
 * both `passport-store` and
 * `passport-dependency`, so the returned module can be passed directly to
 * `createLaceWallet({ modules: [...] })`. A network config the Midnight
 * clients could not use is refused here, before any flow runs.
 *
 * @param props - The module's seams, each described on
 *   {@link CreatePassportAccountModuleProps}.
 * @returns A module for the `modules` array of `createLaceWallet`.
 */
export const createPassportAccountModule = (
  props: CreatePassportAccountModuleProps,
) => {
  validatePassportNetwork(props.network);
  return inferModuleContext({
    moduleName: ModuleName('passport-account'),
    implements: combineContracts([
      passportStoreContract,
      passportDependencyContract,
    ] as const),
    store: inferStoreContext({
      load: async () =>
        import('./store/init').then(({ createInit }) => ({
          default: createInit(props),
        })),
      context: {
        actions: passportActions,
        selectors: passportSelectors,
      },
    }),
    addons: {},
  });
};
