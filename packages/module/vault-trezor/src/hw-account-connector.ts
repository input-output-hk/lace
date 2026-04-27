import { TrezorKeyAgent } from '@cardano-sdk/hardware-trezor';
import { CommunicationType, KeyPurpose } from '@cardano-sdk/key-management';
import {
  CardanoAccountId,
  type CardanoBip32AccountProps,
  getNetworkDetails,
} from '@lace-contract/cardano-context';

import { TREZOR_MANIFEST } from './const';

import type { AvailableAddons } from '.';
import type { ContextualLaceInit } from '@lace-contract/module';
import type {
  DerivationType,
  HwAccountConnector,
} from '@lace-contract/onboarding-v2';

const getCardanoXpub = async (
  accountIndex: number,
  derivationType?: DerivationType,
) => {
  await TrezorKeyAgent.initializeTrezorTransport({
    communicationType: CommunicationType.Web,
    manifest: TREZOR_MANIFEST,
    lazyLoad: true,
  });
  return TrezorKeyAgent.getXpub({
    accountIndex,
    communicationType: CommunicationType.Web,
    purpose: KeyPurpose.STANDARD,
    derivationType,
  });
};

const loadHwAccountConnector: ContextualLaceInit<
  HwAccountConnector[],
  AvailableAddons
> = () => [
  {
    blockchainName: 'Cardano',
    connectHardwareAccounts: async (state, props) => {
      const {
        accountIndex,
        accountName,
        derivationType,
        walletId,
        targetNetworks,
      } = props;
      const publicKey = await getCardanoXpub(accountIndex, derivationType);

      return [...targetNetworks].map(targetNetworkId => {
        const { chainId, networkId, networkType } = getNetworkDetails(
          state,
          targetNetworkId,
        );

        return {
          networkType,
          blockchainNetworkId: networkId,
          accountType: 'HardwareTrezor' as const,
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

export default loadHwAccountConnector;
