import {
  CardanoAccountId,
  type CardanoBip32AccountProps,
  getNetworkDetails,
} from '@lace-contract/cardano-context';

import type { AvailableAddons } from '.';
import type { LedgerCardanoTransport } from './ledger-cardano-transport';
import type { ContextualLaceInit } from '@lace-contract/module';
import type { HwAccountConnector } from '@lace-contract/onboarding-v2';

export interface HwAccountConnectorDependencies {
  transport: LedgerCardanoTransport;
}

export const makeLoadHwAccountConnector =
  (
    dependencies: HwAccountConnectorDependencies,
  ): ContextualLaceInit<HwAccountConnector[], AvailableAddons> =>
  () =>
    [
      {
        blockchainName: 'Cardano',
        connectHardwareAccounts: async (state, props) => {
          const {
            device,
            accountIndex,
            accountName,
            walletId,
            targetNetworks,
          } = props;
          const publicKey = await dependencies.transport.getXpub(
            device,
            accountIndex,
          );

          return [...targetNetworks].map(targetNetworkId => {
            const { chainId, networkId, networkType } = getNetworkDetails(
              state,
              targetNetworkId,
            );

            return {
              networkType,
              blockchainNetworkId: networkId,
              accountType: 'HardwareLedger' as const,
              walletId,
              accountId: CardanoAccountId(
                walletId,
                accountIndex,
                chainId.networkMagic,
              ),
              blockchainName: 'Cardano',
              metadata: { name: accountName },
              blockchainSpecific: {
                chainId,
                accountIndex,
                extendedAccountPublicKey: publicKey,
                networkId,
              } satisfies CardanoBip32AccountProps,
            };
          });
        },
      },
    ];
