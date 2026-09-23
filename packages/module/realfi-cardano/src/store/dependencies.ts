import { createRealFiProvider } from '../realfi-provider';

import type { RealFiBlockfrostConfig } from '../realfi-blockfrost';
import type { RealFiNetworkConfig } from '../realfi-config';
import type { LaceInitSync, ModuleInitProps } from '@lace-contract/module';
import type { RealFiProviderDependencies } from '@lace-contract/realfi-staking';

/**
 * Build a resolver that returns Lace's Blockfrost client config for a given
 * RealFi network (from the cardano-provider config for that network's magic).
 * Lace routes Blockfrost through its proxy (LW-14499): the config carries the
 * per-network proxy `baseUrl` and normally NO `projectId` — the key is
 * injected server-side — so resolving on `baseUrl`, never on `projectId`.
 * Structural read (ADR-14: no import of the blockfrost provider module). The
 * provider resolves this per request so it follows the active network, not a
 * value fixed at init. Returns `undefined` only if Lace has no Blockfrost
 * config for the network (the provider then reports unavailable).
 */
const makeResolveBlockfrostClientConfig = (
  runtime: ModuleInitProps['runtime'],
): ((config: RealFiNetworkConfig) => RealFiBlockfrostConfig | undefined) => {
  const cardanoProvider = runtime.config.cardanoProvider as {
    blockfrostConfigs?: Partial<
      Record<
        number,
        {
          clientConfig?: {
            baseUrl?: string;
            projectId?: string;
            apiVersion?: string;
          };
        }
      >
    >;
  };
  return (config: RealFiNetworkConfig): RealFiBlockfrostConfig | undefined => {
    const clientConfig =
      cardanoProvider.blockfrostConfigs?.[config.networkMagic]?.clientConfig;
    if (!clientConfig?.baseUrl) return undefined;
    return {
      baseUrl: clientConfig.baseUrl,
      projectId: clientConfig.projectId,
      apiVersion: clientConfig.apiVersion,
    };
  };
};

export const initializeDependencies: LaceInitSync<
  RealFiProviderDependencies
> = ({ runtime }) => ({
  realfiProviders: [
    createRealFiProvider({
      resolveBlockfrostClientConfig: makeResolveBlockfrostClientConfig(runtime),
    }),
  ],
});
