import { makeLoadHwAccountConnector } from '../hw-account-connector';

import { ledgerCardanoTransportWeb } from './ledger-cardano-transport-web';

const loadHwAccountConnectorWeb = makeLoadHwAccountConnector({
  transport: ledgerCardanoTransportWeb,
});

export default loadHwAccountConnectorWeb;
