import { WalletType } from '@lace-contract/wallet-repo';

import {
  LEDGER_BITCOIN_ONBOARDING_OPTION_ID,
  LEDGER_ONBOARDING_OPTION_ID,
} from './const';

import type { AvailableAddons } from '.';
import type { ContextualLaceInit } from '@lace-contract/module';
import type { HwBlockchainSupport } from '@lace-contract/onboarding-v2';

/**
 * Advertises that the Ledger wallet type supports Cardano and Bitcoin, each
 * keyed by its own onboarding option id. Account selection stays with the app
 * for both blockchains: Lace requests a specific account index over the
 * transport and the device only approves the key export.
 */
const loadHwBlockchainSupport: ContextualLaceInit<
  HwBlockchainSupport[],
  AvailableAddons
> = () => [
  {
    deviceOptionId: LEDGER_ONBOARDING_OPTION_ID,
    walletType: WalletType.HardwareLedger,
    blockchainName: 'Cardano',
  },
  {
    deviceOptionId: LEDGER_BITCOIN_ONBOARDING_OPTION_ID,
    walletType: WalletType.HardwareLedger,
    blockchainName: 'Bitcoin',
  },
];

export default loadHwBlockchainSupport;
