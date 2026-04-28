import { Bip32Account } from '@cardano-sdk/key-management';

import type { Blake2b } from '@lace-contract/crypto';

export default async (): Promise<Blake2b> => {
  const dependencies = await Bip32Account.createDefaultDependencies();
  return dependencies.blake2b;
};
