import { NetworkId } from '@midnight-ntwrk/wallet-sdk-abstractions';
import { vi } from 'vitest';

import type {
  SenderContext,
  ExtendedDAppConnectorWalletAPI,
} from '../../src/types';
import type {
  Configuration,
  KeyMaterialProvider,
} from '@midnight-ntwrk/dapp-connector-api';
import type { ProvingProvider } from '@midnight-ntwrk/ledger-v8';

export const testServiceUriConfig: Configuration = {
  indexerUri: 'http://test-indexer-uri',
  indexerWsUri: 'ws://test-indexer-ws-uri',
  proverServerUri: 'http://test-prover-uri',
  substrateNodeUri: 'http://test-substrate-uri',
  networkId: NetworkId.NetworkId.Preview,
};

const testDustToken1 =
  '02000000000000000000000000000000000000000000000000000000000000000000';
const testDustToken2 =
  '02000000000000000000000000000000000000000000000000000000000000000002';
const testDustToken3 =
  '02000000000000000000000000000000000000000000000000000000000000000003';

export const testWalletState = {
  coins: [],
  availableCoins: [],
  pendingCoins: [],
  balances: {
    [testDustToken1]: 10n,
    [testDustToken2]: 4n,
    [testDustToken3]: 0n,
  },
  transactionHistory: [],
  syncProgress: undefined,
  address:
    'mn_shield-addr_test1d230lenyxp84lhn7qvuf4y023c7cn53lxleckcekvneuqgvdk0wqxqp3zzpc05q3flf3f3jxamkymw399zj7gy8apehfqq2gp02cwjh905ewkepmvv7znhk56vgxj8jezwh9avr0a7qcvyyzy36e7u',
  coinPublicKey:
    'mn_shield-cpk_test1d230lenyxp84lhn7qvuf4y023c7cn53lxleckcekvneuqgvdk0wq0exun7',
  encryptionPublicKey:
    'mn_shield-epk_test1qvqrzyyrslgpzn7nznrydmhvfkaz2299usg06rnwjqq5sz74sa9w2lfjadjrkceu980df5csdy09jyawt6cxlmupscggyvuh3zn',
};

export const mockSender: SenderContext = {
  sender: { url: 'https://test-dapp.io' },
};

export const testWalletApi: ExtendedDAppConnectorWalletAPI = {
  getNetworkId: async () => NetworkId.NetworkId.Preview,
  getShieldedBalances: async () => testWalletState.balances,
  getUnshieldedBalances: async () => testWalletState.balances,
  getDustBalance: async () => ({ cap: 0n, balance: 0n }),
  getShieldedAddresses: async () => ({
    shieldedAddress: testWalletState.address,
    shieldedCoinPublicKey: testWalletState.coinPublicKey,
    shieldedEncryptionPublicKey: testWalletState.encryptionPublicKey,
  }),
  getUnshieldedAddress: async () => ({
    unshieldedAddress: testWalletState.address,
  }),
  getDustAddress: async () => ({ dustAddress: testWalletState.address }),
  getProvingProvider: async (_keyMaterialProvider: KeyMaterialProvider) => {
    return {} as unknown as ProvingProvider;
  },
  getTxHistory: async () => testWalletState.transactionHistory,
  balanceUnsealedTransaction: async () => ({ tx: 'test-tx-id' }),
  balanceSealedTransaction: async () => ({ tx: 'test-tx-id' }),
  makeTransfer: async () => ({ tx: 'test-tx-id' }),
  makeIntent: async () => ({ tx: 'test-intent-id' }),
  signData: async () => ({
    data: 'test-data',
    signature: 'test-signature',
    verifyingKey: 'test-verifying-key',
  }),
  getConfiguration: async () => testServiceUriConfig,
  getConnectionStatus: async () => ({
    status: 'connected',
    networkId: NetworkId.NetworkId.Preview,
  }),
  hintUsage: async () => {},
  submitTransaction: async () => {},
  checkNetworkSupport: vi.fn().mockResolvedValue(undefined),
  isLocked: vi.fn().mockResolvedValue(false),
};

export const testWalletProperties = {
  name: 'testWallet',
};
