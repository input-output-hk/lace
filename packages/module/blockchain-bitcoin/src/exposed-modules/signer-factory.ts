import { BitcoinInMemorySignerFactory } from '../signing/bitcoin-in-memory-signer-factory';

import type { BitcoinSignerFactory } from '@lace-contract/bitcoin-context';

const initSignerFactory = (): BitcoinSignerFactory =>
  new BitcoinInMemorySignerFactory();

export default initSignerFactory;
