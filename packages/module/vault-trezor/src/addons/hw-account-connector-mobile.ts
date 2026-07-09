import { cardanoAccountsFromXpub } from '../cardano-accounts-from-xpub';
import { getCardanoXpubViaDeepLink } from '../mobile/cardano-xpub';

import type { AvailableMobileAddons } from '..';
import type { ContextualLaceInit } from '@lace-contract/module';
import type { HwAccountConnector } from '@lace-contract/onboarding-v2';

const loadHwAccountConnector: ContextualLaceInit<
  HwAccountConnector[],
  AvailableMobileAddons
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
        // `device` is structurally required by HwAccountsConnectorProps but not
        // used on mobile: the connector re-fetches the xpub via a deep-link
        // round-trip rather than talking to a locally-connected device.
      } = props;
      const { publicKey } = await getCardanoXpubViaDeepLink(
        accountIndex,
        derivationType,
      );

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
];

export default loadHwAccountConnector;
