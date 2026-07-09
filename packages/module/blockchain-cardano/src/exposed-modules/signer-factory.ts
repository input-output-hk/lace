import { CardanoInMemorySignerFactory } from '../signing/cardano-in-memory-signer-factory';

import type { CardanoSignerFactory } from '@lace-contract/cardano-context';

const initSignerFactory = (): CardanoSignerFactory =>
  new CardanoInMemorySignerFactory();

export default initSignerFactory;
