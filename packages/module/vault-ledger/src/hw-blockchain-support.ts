import { WalletType } from '@lace-contract/wallet-repo';

import { LEDGER_ONBOARDING_OPTION_ID } from './const';

import type { AvailableAddons } from '.';
import type { ContextualLaceInit } from '@lace-contract/module';
import type { HwBlockchainSupport } from '@lace-contract/onboarding-v2';

const loadHwBlockchainSupport: ContextualLaceInit<
  HwBlockchainSupport[],
  AvailableAddons
> = () => [
  {
    deviceOptionId: LEDGER_ONBOARDING_OPTION_ID,
    walletType: WalletType.HardwareLedger,
    blockchainName: 'Cardano',
  },
];

export default loadHwBlockchainSupport;
