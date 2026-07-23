import { initializeMidnightDappConnectorSideEffectDependencies } from './dapp-connector';

import type { WithLogger } from '@lace-lib/util';

export type MidnightSideDappConnectorEffectsDependencies = ReturnType<
  typeof initializeMidnightDappConnectorSideEffectDependencies
>;

export const initializeSideEffectDependencies = (dependencies: WithLogger) => ({
  ...initializeMidnightDappConnectorSideEffectDependencies(dependencies),
});
