import { makeLoadHwAccountConnector } from '../hw-account-connector';

import { ledgerCardanoTransportMobile } from './ledger-cardano-transport-mobile';

const loadHwAccountConnectorMobile = makeLoadHwAccountConnector({
  transport: ledgerCardanoTransportMobile,
});

export default loadHwAccountConnectorMobile;
