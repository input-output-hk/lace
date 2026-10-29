import {
  MidnightSDKTestNetworkId,
  registerMidnightBlockchainNetworks,
} from '@lace-contract/midnight-context';

import { createMidnightSideEffectDependencies } from './dependencies';
import { createInitializeSideEffects } from './side-effects';
import {
  createApplyNetworkConfigOverrides,
  createApplyNetworkDefaultsMiddleware,
} from './side-effects/network-config';
import { createHeadlessResetSyncStateSideEffect } from './side-effects/resync';

import type { MidnightEngineOptions } from './dependencies';
import type { MidnightNetworkStartupConfig } from './side-effects/network-config';
import type {
  AccessAuthSecret,
  Authenticate,
} from '@lace-contract/authentication-prompt';
import type {
  AppConfig,
  LaceInit,
  LaceModuleStoreInit,
} from '@lace-contract/module';

/**
 * What the engine needs to decrypt account keys. The app shell serves these
 * from the authentication prompt; a headless loadout serves them itself.
 */
export type MidnightSyncAuth = {
  accessAuthSecret: AccessAuthSecret;
  authenticate: Authenticate;
};

export type MidnightSyncSdkOptions = MidnightNetworkStartupConfig &
  Pick<MidnightEngineOptions, 'batchUpdates' | 'createAttestedProver'> & {
    auth: MidnightSyncAuth;
  };

// The contract starts the wallet on this testnet and reads it without a
// fallback, so a headless loadout without it would sync a network named
// "undefined". The application shells always set it.
const assertDefaultTestnetConfigured = (
  config: Partial<AppConfig> | undefined,
) => {
  const networkId = config?.defaultMidnightTestnetNetworkId;
  if (!networkId || !MidnightSDKTestNetworkId.includes(networkId))
    throw new Error(
      `createLaceWallet needs config.defaultMidnightTestnetNetworkId, the Midnight testnet a wallet starts on: one of ${MidnightSDKTestNetworkId.join(
        ', ',
      )}; got ${String(networkId)}`,
    );
};

export const createSdkStoreInit = ({
  auth,
  batchUpdates,
  createAttestedProver,
  networks = {},
  supportedNetworkIds,
  defaultProofServers,
}: MidnightSyncSdkOptions): LaceInit<LaceModuleStoreInit> => {
  const initializeSideEffects = createInitializeSideEffects(storage => [
    registerMidnightBlockchainNetworks,
    createApplyNetworkConfigOverrides(networks),
    createHeadlessResetSyncStateSideEffect(storage),
  ]);
  const initializeDependencies = createMidnightSideEffectDependencies({
    batchUpdates,
    createAttestedProver,
  });
  return (props, dependencies) => {
    assertDefaultTestnetConfigured(props.runtime.config);
    return {
      middleware: [
        createApplyNetworkDefaultsMiddleware({
          supportedNetworkIds,
          defaultProofServers,
        }),
      ],
      sideEffects: initializeSideEffects(props, dependencies),
      sideEffectDependencies: {
        ...initializeDependencies(props, dependencies),
        ...auth,
      },
    };
  };
};
