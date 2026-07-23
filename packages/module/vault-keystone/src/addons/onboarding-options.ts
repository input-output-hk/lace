import { WalletType } from '@lace-contract/wallet-repo';

import {
  KEYSTONE_DEVICE_MODELS,
  KEYSTONE_DEVICE_NAME,
  KEYSTONE_ONBOARDING_OPTION_ID,
} from '../const';

import type { AvailableAddons } from '..';
import type { ContextualLaceInit } from '@lace-contract/module';
import type { OnboardingOption } from '@lace-contract/onboarding-v2';

/**
 * Single air-gapped Keystone onboarding option. No usb/ble filters: there is
 * no wired device to scan, the connection is the QR exchange. The supported
 * blockchains are advertised separately via loadHwBlockchainSupport.
 */
const keystoneOnboardingOption: OnboardingOption = {
  id: KEYSTONE_ONBOARDING_OPTION_ID,
  walletType: WalletType.HardwareKeystone,
  isHwDevice: true,
  isAirGapped: true,
  device: {
    id: KEYSTONE_ONBOARDING_OPTION_ID,
    name: KEYSTONE_DEVICE_NAME,
    models: KEYSTONE_DEVICE_MODELS,
    logo: 'Keystone',
  },
};

/** Advertises the Keystone onboarding tile. */
const loadOnboardingOptions: ContextualLaceInit<
  OnboardingOption[],
  AvailableAddons
> = () => [keystoneOnboardingOption];

export default loadOnboardingOptions;
