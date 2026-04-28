import { CardanoLedgerSignerFactory } from '../signing/cardano-ledger-signer-factory';

import type { CardanoSignerFactory } from '@lace-contract/cardano-context';

const initSignerFactory = (): CardanoSignerFactory =>
  new CardanoLedgerSignerFactory();

export default initSignerFactory;
