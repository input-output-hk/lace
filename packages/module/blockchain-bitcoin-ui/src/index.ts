import { accountSettingsUIAddonContract } from '@lace-contract/account-management';
import { BITCOIN_FEATURE_FLAG } from '@lace-contract/bitcoin-context';
import { featureStoreContract } from '@lace-contract/feature';
import {
  combineContracts,
  inferModuleContext,
  ModuleName,
} from '@lace-contract/module';

import type { LaceModuleMap } from '@lace-contract/module';

const extensionModule = inferModuleContext({
  moduleName: ModuleName('blockchain-bitcoin-ui'),
  implements: combineContracts([accountSettingsUIAddonContract] as const),
  dependsOn: combineContracts([featureStoreContract] as const),
  addons: {
    loadAccountSettingsUICustomisations: async () =>
      import('./addons/account-settings'),
  },
  feature: {
    metadata: { name: 'Bitcoin-UI', description: 'UI module for Bitcoin' },
    willLoad: featureFlags =>
      featureFlags.map(({ key }) => key).includes(BITCOIN_FEATURE_FLAG),
  },
});

const moduleMap: LaceModuleMap = {
  'lace-mobile': extensionModule,
  'lace-extension': extensionModule,
  'lace-extension-guest': extensionModule,
};

export default moduleMap;
