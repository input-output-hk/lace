import { initializeCardanoDappConnectorDependencies } from './dapp-connector';

import type { WithLogger } from '@lace-sdk/util';

export {
  CardanoDappConnectorApi,
  type CardanoDappConnectorApiDependencies,
} from '../../../common/store/dependencies/cardano-dapp-connector-api';

export type CardanoDappConnectorSideEffectDependencies = ReturnType<
  typeof initializeCardanoDappConnectorDependencies
>;

/**
 * Initializes side effect dependencies for the browser extension.
 *
 * @param dependencies - Dependencies including logger
 * @returns Object containing initialized side effect dependencies
 */
export const initializeSideEffectDependencies = (dependencies: WithLogger) => ({
  ...initializeCardanoDappConnectorDependencies(dependencies),
});
