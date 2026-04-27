import { WalletType } from '@lace-contract/wallet-repo';
import { ledgerUSBVendorId } from '@ledgerhq/devices';

import { LEDGER_ONBOARDING_OPTION_ID } from './const';

import type { AvailableAddons } from '.';
import type { ContextualLaceInit } from '@lace-contract/module';
import type { OnboardingOption } from '@lace-contract/onboarding-v2';

const loadOnboardingOptions: ContextualLaceInit<
  OnboardingOption[],
  AvailableAddons
> = () => [
  {
    id: LEDGER_ONBOARDING_OPTION_ID,
    walletType: WalletType.HardwareLedger,
    isHwDevice: true,
    device: {
      id: LEDGER_ONBOARDING_OPTION_ID,
      name: 'LEDGER',
      models: [],
      logo: 'Ledger',
    },
    usbFilters: [{ vendorId: ledgerUSBVendorId }],
  },
];

export default loadOnboardingOptions;
