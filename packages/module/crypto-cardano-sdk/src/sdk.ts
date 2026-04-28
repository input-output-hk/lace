import { cryptoAddonContract } from '@lace-contract/crypto';
import {
  combineContracts,
  inferModuleContext,
  ModuleName,
} from '@lace-contract/module';

export default inferModuleContext({
  moduleName: ModuleName('crypto-cardano-sdk'),
  implements: combineContracts([cryptoAddonContract] as const),
  addons: {
    bip32Ed25519: async () => import('./bip32ed25519'),
    blake2b: async () => import('./blake2b'),
  },
});
