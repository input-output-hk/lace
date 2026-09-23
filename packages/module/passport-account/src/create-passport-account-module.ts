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

import type {
  FeeSponsor,
  PassportAuthoriser,
  PassportNetworkConfig,
  PassportProver,
} from '@lace-contract/passport';

export type CreatePassportAccountModuleProps = {
  authoriser: PassportAuthoriser;
  sponsor: FeeSponsor;
  prover: PassportProver;
  network: PassportNetworkConfig;
};

/**
 * Builds the Passport account module for the given platform capabilities:
 * the device authoriser, fee sponsor, prover, and Midnight network
 * endpoints. Implements both `passport-store` and `passport-dependency`,
 * so the returned module can be passed directly to
 * `createLaceWallet({ modules: [...] })`.
 */
export const createPassportAccountModule = (
  props: CreatePassportAccountModuleProps,
) =>
  inferModuleContext({
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
