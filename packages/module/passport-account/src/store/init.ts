import { createDependencies } from './dependencies';
import { runPassportFlow } from './side-effects/passport-flows';
import { restorePassportAccount } from './side-effects/restore-account';

import type { CreatePassportAccountModuleProps } from '../create-passport-account-module';
import type { LaceInit, LaceModuleStoreInit } from '@lace-contract/module';

/**
 * Builds the passport-account module's store initializer for the given
 * platform capabilities: the mutually exclusive passport flows behind the
 * createAccount, signIn, addDevice and removeDevice actions, and the
 * restore of a previously created account from its persisted record.
 */
export const createInit =
  (props: CreatePassportAccountModuleProps): LaceInit<LaceModuleStoreInit> =>
  () => ({
    sideEffects: [runPassportFlow, restorePassportAccount],
    sideEffectDependencies: createDependencies(props),
  });
