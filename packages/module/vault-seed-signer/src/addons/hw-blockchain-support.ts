import { WalletType } from '@lace-contract/wallet-repo';

import {
  SEED_SIGNER_BITCOIN_ONBOARDING_OPTION_ID,
  SEED_SIGNER_ONBOARDING_OPTION_ID,
} from '../const';

import type { AvailableAddons } from '..';
import type { ContextualLaceInit } from '@lace-contract/module';
import type { HwBlockchainSupport } from '@lace-contract/onboarding-v2';

/**
 * Advertises that the Seed Signer wallet type supports both Cardano and Bitcoin,
 * each keyed by its own onboarding option id.
 */
const loadHwBlockchainSupport: ContextualLaceInit<
  HwBlockchainSupport[],
  AvailableAddons
> = () => [
  {
    deviceOptionId: SEED_SIGNER_ONBOARDING_OPTION_ID,
    walletType: WalletType.HardwareSeedSigner,
    blockchainName: 'Cardano',
  },
  {
    deviceOptionId: SEED_SIGNER_BITCOIN_ONBOARDING_OPTION_ID,
    walletType: WalletType.HardwareSeedSigner,
    blockchainName: 'Bitcoin',
    // The Bitcoin export QR carries whatever account/network the user picked
    // on the device; Lace cannot request a specific one.
    accountSelection: 'device',
  },
];

export default loadHwBlockchainSupport;
