import { cryptoAddonContract } from '@lace-contract/crypto';
import {
  combineContracts,
  inferModuleContext,
  ModuleName,
} from '@lace-contract/module';

/** Cardano cryptography: BIP32-Ed25519 key derivation and Blake2b hashing. */
export default inferModuleContext({
  moduleName: ModuleName('crypto-cardano-sdk'),
  implements: combineContracts([cryptoAddonContract] as const),
  addons: {
    bip32Ed25519: async () => import('./bip32ed25519'),
    blake2b: async () => import('./blake2b'),
  },
});
