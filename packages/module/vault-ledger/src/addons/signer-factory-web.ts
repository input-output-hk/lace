import { CardanoLedgerSignerFactory } from '../signing/cardano-ledger-signer-factory';

import { ledgerCardanoTransportWeb } from './ledger-cardano-transport-web';
import { resolveLegacyDevice } from './resolve-legacy-device-web';

import type { CardanoSignerFactory } from '@lace-contract/cardano-context';

const loadSignerFactoryWeb = (): CardanoSignerFactory =>
  new CardanoLedgerSignerFactory({
    transport: ledgerCardanoTransportWeb,
    resolveLegacyDevice,
  });

export default loadSignerFactoryWeb;
