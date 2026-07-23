import { makeLoadHwAccountConnector } from '../hw-account-connector';

import { ledgerBitcoinTransportWeb } from './ledger-bitcoin-transport-web';
import { ledgerCardanoTransportWeb } from './ledger-cardano-transport-web';

const loadHwAccountConnectorWeb = makeLoadHwAccountConnector({
  bitcoinTransport: ledgerBitcoinTransportWeb,
  cardanoTransport: ledgerCardanoTransportWeb,
});

export default loadHwAccountConnectorWeb;
