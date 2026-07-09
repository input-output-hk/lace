import { CardanoLedgerSignerFactory } from '../signing/cardano-ledger-signer-factory';

import { ledgerCardanoTransportMobile } from './ledger-cardano-transport-mobile';

import type { CardanoSignerFactory } from '@lace-contract/cardano-context';

const loadSignerFactoryMobile = (): CardanoSignerFactory =>
  new CardanoLedgerSignerFactory({ transport: ledgerCardanoTransportMobile });

export default loadSignerFactoryMobile;
