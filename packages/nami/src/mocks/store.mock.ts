/* eslint-disable unicorn/no-null */
import { network } from './network.mock';

export const settings = {
  adaSymbol: 't₳',
  currency: 'usd',
  network,
};

export const store = {
  settings: { settings },
  globalModel: {
    sendStore: {
      fee: { fee: '0' },
      value: { ada: '', assets: [], personalAda: '', minAda: '0' },
      address: { result: '', display: '' },
      message: '',
      tx: null,
      txInfo: {
        protocolParameters: null,
        utxos: [],
        balance: { lovelace: '0', assets: null },
      },
    },
  },
};
