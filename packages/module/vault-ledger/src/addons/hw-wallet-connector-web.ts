import { makeLoadHwWalletConnector } from '../hw-wallet-connector';

import { resolveLegacyDevice } from './resolve-legacy-device-web';

const loadHwWalletConnectorWeb = makeLoadHwWalletConnector({
  resolveLegacyDevice,
});

export default loadHwWalletConnectorWeb;
