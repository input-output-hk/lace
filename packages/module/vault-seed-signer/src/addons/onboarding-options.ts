import { WalletType } from '@lace-contract/wallet-repo';

import {
  SEED_SIGNER_DISPLAY_NAME,
  SEED_SIGNER_ONBOARDING_OPTION_ID,
} from '../const';

import type { AvailableAddons } from '..';
import type { ContextualLaceInit } from '@lace-contract/module';
import type { OnboardingOption } from '@lace-contract/onboarding-v2';

/**
 * Single air-gapped Seed Signer onboarding option. The device supports both
 * Cardano and Bitcoin, advertised separately via loadHwBlockchainSupport. This
 * tile uses the Cardano option id as its stable tile id; the blockchain
 * selection step resolves the per-blockchain option id (seed-signer or
 * seed-signer-bitcoin) deterministically before create. No usb/ble filters:
 * there is no wired device to scan, the connection is the QR exchange. Models
 * stay empty so the tile shows only the logo, like Ledger and Trezor.
 */
const seedSignerOnboardingOption: OnboardingOption = {
  id: SEED_SIGNER_ONBOARDING_OPTION_ID,
  walletType: WalletType.HardwareSeedSigner,
  isHwDevice: true,
  isAirGapped: true,
  device: {
    id: SEED_SIGNER_ONBOARDING_OPTION_ID,
    name: SEED_SIGNER_DISPLAY_NAME,
    models: [],
    logo: 'SeedSigner',
  },
};

/**
 * Advertises the single Seed Signer onboarding tile. The blockchain (and its
 * per-blockchain option id) is chosen in the blockchain selection step.
 */
const loadOnboardingOptions: ContextualLaceInit<
  OnboardingOption[],
  AvailableAddons
> = () => [seedSignerOnboardingOption];

export default loadOnboardingOptions;
