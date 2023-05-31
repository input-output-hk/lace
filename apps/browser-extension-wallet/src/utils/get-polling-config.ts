import { config } from '@src/config';
import { Wallet } from '@lace/cardano';

export const getPollingConfig = (): Wallet.PollingConfig => {
  const { WALLET_INTERVAL, WALLET_SYNC_TIMEOUT } = config();
  return {
    interval: WALLET_INTERVAL,
    // eslint-disable-next-line no-magic-numbers
    maxInterval: WALLET_INTERVAL * 20,
    consideredOutOfSyncAfter: WALLET_SYNC_TIMEOUT
  };
};
