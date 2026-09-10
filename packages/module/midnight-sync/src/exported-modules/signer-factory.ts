import { MidnightInMemorySignerFactory } from '../signing/midnight-in-memory-signer-factory';

import type { MidnightSignerFactory } from '@lace-contract/midnight-context';

const initSignerFactory = (): MidnightSignerFactory =>
  new MidnightInMemorySignerFactory();

export default initSignerFactory;
