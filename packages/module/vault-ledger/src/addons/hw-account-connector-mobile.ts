import { makeLoadHwAccountConnector } from '../hw-account-connector';

import { ledgerBitcoinTransportMobile } from './ledger-bitcoin-transport-mobile';
import { ledgerCardanoTransportMobile } from './ledger-cardano-transport-mobile';

const loadHwAccountConnectorMobile = makeLoadHwAccountConnector({
  bitcoinTransport: ledgerBitcoinTransportMobile,
  cardanoTransport: ledgerCardanoTransportMobile,
});

export default loadHwAccountConnectorMobile;
