import type { MidnightSDKNetworkId } from '@lace-contract/midnight-context';
import type {
  MidnightAccountInfo,
  MidnightStateSnapshot,
  MidnightSyncStatus,
} from '@lace-lib/extension-shell-api';

export const NETWORK_ID = 'preview' as MidnightSDKNetworkId;

export const midnightAccountInfo: MidnightAccountInfo = {
  accountIndex: 0,
  networkId: NETWORK_ID,
  shieldedAddress: 'mn_shield_test1qshielded',
  unshieldedAddress: 'mn_addr_test1qunshielded',
  dustAddress: 'mn_dust_test1qdust',
  publicKeys: { coinPublicKey: 'aa11', encryptionPublicKey: 'bb22' },
};

/** A full snapshot: one shielded token, one unshielded token (RAW type — the
 * guest re-prefixes), dust balance + generation details, one history entry. */
export const stateSnapshot: MidnightStateSnapshot = {
  midnightAccount: midnightAccountInfo,
  shieldedCoins: [{ tokenType: 'shieldedA', available: '100', pending: '5' }],
  unshieldedCoins: [{ tokenType: 'rawNight', available: '200', pending: '0' }],
  dust: {
    balance: '42',
    available: '30',
    generationDetails: {
      currentValue: '42',
      maxCap: '1000',
      rate: '3',
      decayTime: 111,
      maxCapReachedAt: 222,
    },
  },
  transactionHistory: [
    {
      id: 'txhash1',
      timestamp: 123_456,
      direction: 'incoming',
      deltas: [{ tokenType: 'rawNight', amount: '10' }],
    },
  ],
};

export const syncStatusInProgress: MidnightSyncStatus = {
  engineLive: true,
  keysWarm: true,
  synced: false,
  progress: { shielded: 0.5, unshielded: 0.4, dust: 0 },
};

export const syncStatusComplete: MidnightSyncStatus = {
  engineLive: true,
  keysWarm: true,
  synced: true,
  progress: { shielded: 1, unshielded: 1, dust: 0 },
};

export const syncStatusCold: MidnightSyncStatus = {
  engineLive: false,
  keysWarm: false,
  synced: false,
  progress: null,
};
