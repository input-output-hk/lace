import { Cardano } from '@cardano-sdk/core';
import {
  CardanoNetworkId,
  getCardanoChainIdByTestnetId,
  getCardanoTestnetIdByNetworkMagic,
} from '@lace-contract/cardano-context';
import { filter, map } from 'rxjs';

import type { SideEffect } from '..';
import type { AppConfig } from '@lace-contract/module';
import type { TestnetOption } from '@lace-contract/network';

const mainnetMagic = Number(Cardano.NetworkMagics.Mainnet);

export const deriveCardanoTestnetOptions = (
  config: AppConfig,
): TestnetOption[] => {
  const blockfrostConfigs = (
    config.cardanoProvider as {
      blockfrostConfigs?: Partial<Record<Cardano.NetworkMagic, unknown>>;
    }
  ).blockfrostConfigs;
  const configuredNetworkMagics = Object.keys(blockfrostConfigs ?? {}).map(
    key => Number(key),
  );

  const supportedTestnetIds = configuredNetworkMagics
    .filter(magic => magic !== mainnetMagic)
    .map(getCardanoTestnetIdByNetworkMagic)
    .filter((id): id is NonNullable<typeof id> => Boolean(id));

  return supportedTestnetIds.map(id => {
    const chainId = getCardanoChainIdByTestnetId(id);
    return {
      id: CardanoNetworkId(chainId.networkMagic),
      label:
        id === 'preprod'
          ? 'v2.network-status.preprod'
          : id === 'preview'
          ? 'v2.network-status.preview'
          : 'v2.network-status.preprod', // Fallback for sanchonet - uses preprod label
    };
  });
};

export const registerCardanoTestnetOptions: (
  testnetOptions: TestnetOption[],
) => SideEffect =
  testnetOptions =>
  (_, { network: { selectTestnetOptions$ } }, { actions }) =>
    selectTestnetOptions$.pipe(
      filter(options => !options?.Cardano),
      map(() =>
        actions.network.setTestnetOptions({
          blockchainName: 'Cardano',
          options: testnetOptions,
        }),
      ),
    );

export const createCardanoSideEffects = (config: AppConfig) => {
  const testnetOptions = deriveCardanoTestnetOptions(config);
  return [registerCardanoTestnetOptions(testnetOptions)];
};
