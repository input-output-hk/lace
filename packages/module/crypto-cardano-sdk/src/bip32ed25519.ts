import { Bip32Account } from '@cardano-sdk/key-management';

import type { Bip32Ed25519 } from '@lace-contract/crypto';

export default async (): Promise<Bip32Ed25519> => {
  const dependencies = await Bip32Account.createDefaultDependencies();
  return dependencies.bip32Ed25519;
};
