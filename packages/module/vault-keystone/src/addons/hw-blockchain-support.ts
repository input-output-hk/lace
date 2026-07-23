import { WalletType } from '@lace-contract/wallet-repo';

import {
  KEYSTONE_BITCOIN_ONBOARDING_OPTION_ID,
  KEYSTONE_MAX_CARDANO_ACCOUNT_INDEX,
  KEYSTONE_ONBOARDING_OPTION_ID,
} from '../const';

import type { AvailableAddons } from '..';
import type { ContextualLaceInit } from '@lace-contract/module';
import type { HwBlockchainSupport } from '@lace-contract/onboarding-v2';

/**
 * Advertises that the Keystone wallet type supports Cardano and Bitcoin, each
 * keyed by its own onboarding option id. For Cardano, account selection stays
 * with the app: Lace requests a specific account index via the
 * qr-hardware-call key derivation request and the device only approves, but
 * Keystone firmware only derives accounts #0-#24, so the picker is capped. For
 * Bitcoin, the device dictates the account: the connect-software-wallet
 * export carries whatever account the device pre-derived, so Lace cannot
 * request a specific one.
 */
const loadHwBlockchainSupport: ContextualLaceInit<
  HwBlockchainSupport[],
  AvailableAddons
> = () => [
  {
    deviceOptionId: KEYSTONE_ONBOARDING_OPTION_ID,
    walletType: WalletType.HardwareKeystone,
    blockchainName: 'Cardano',
    maxAccountIndex: KEYSTONE_MAX_CARDANO_ACCOUNT_INDEX,
  },
  {
    deviceOptionId: KEYSTONE_BITCOIN_ONBOARDING_OPTION_ID,
    walletType: WalletType.HardwareKeystone,
    blockchainName: 'Bitcoin',
    accountSelection: 'device',
  },
];

export default loadHwBlockchainSupport;
