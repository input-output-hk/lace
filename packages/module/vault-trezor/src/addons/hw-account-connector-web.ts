import { TrezorKeyAgent } from '@cardano-sdk/hardware-trezor';
import { CommunicationType, KeyPurpose } from '@cardano-sdk/key-management';

import { makeBitcoinHwAccountConnector } from '../bitcoin/hw-account-connector';
import { cardanoAccountsFromXpub } from '../cardano-accounts-from-xpub';
import { TREZOR_MANIFEST } from '../const';

import { getTrezorBitcoinConnectWeb } from './trezor-bitcoin-connect-web';

import type { AvailableAddons } from '..';
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

      return cardanoAccountsFromXpub({
        state,
        walletId,
        accountIndex,
        accountName,
        targetNetworks,
        publicKey,
      });
    },
  },
  makeBitcoinHwAccountConnector({ getConnect: getTrezorBitcoinConnectWeb }),
];

export default loadHwAccountConnector;
