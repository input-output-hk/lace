import { WalletType } from '@lace-contract/wallet-repo';

import {
  TREZOR_BITCOIN_ONBOARDING_OPTION_ID,
  TREZOR_ONBOARDING_OPTION_ID,
} from './const';

import type { AvailableAddons } from '.';
import type { ContextualLaceInit } from '@lace-contract/module';
import type { HwBlockchainSupport } from '@lace-contract/onboarding-v2';

/**
 * Advertises that the Trezor wallet type supports Cardano and Bitcoin, each
 * keyed by its own onboarding option id. Account selection stays with the app
 * for both blockchains: Lace requests a specific account index from the
 * device and the device only approves the key export.
 */
const loadHwBlockchainSupport: ContextualLaceInit<
  HwBlockchainSupport[],
  AvailableAddons
> = () => [
  {
    deviceOptionId: TREZOR_ONBOARDING_OPTION_ID,
    walletType: WalletType.HardwareTrezor,
    blockchainName: 'Cardano',
  },
  {
    deviceOptionId: TREZOR_BITCOIN_ONBOARDING_OPTION_ID,
    walletType: WalletType.HardwareTrezor,
    blockchainName: 'Bitcoin',
  },
];

export default loadHwBlockchainSupport;
