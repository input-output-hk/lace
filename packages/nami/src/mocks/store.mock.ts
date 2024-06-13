import { network } from './network.mock';

export const settings = {
  adaSymbol: 't₳',
  currency: 'usd',
  network,
};

export const store = {
  settings: { settings },
  globalModel: { sendStore: {} },
};
