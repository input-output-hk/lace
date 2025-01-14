/* eslint-disable no-magic-numbers */
import { Cardano, RewardAccountInfoProvider } from '@cardano-sdk/core';
import { ObservableWallet, BaseWallet, createPersonalWallet, storage } from '@cardano-sdk/wallet';
import * as KeyManagement from '@cardano-sdk/key-management';
import { assetsProviderStub } from './AssetsProviderStub';
import { networkInfoProviderStub } from './NetworkInfoProviderStub';
import { queryTransactionsResult, rewardAccount } from './ProviderStub';
import { testKeyAgent } from './TestKeyAgent';
import { TxSubmitProviderFake } from '@wallet/test/mocks/TxSubmitProviderFake';
import { utxoProviderStub } from './UtxoProviderStub';
import { chainHistoryProviderStub } from './ChainHistoryProviderStub';
import { rewardsHistoryProviderStub } from './RewardsProviderStub';
import { of } from 'rxjs';

const logger = console;
const name = 'Test Wallet';
const address = queryTransactionsResult[0].body.inputs[0].address;
const knownAddresses: KeyManagement.GroupedAddress = {
  address,
  rewardAccount,
  accountIndex: 0,
  index: 0,
  networkId: Cardano.NetworkId.Testnet,
  type: KeyManagement.AddressType.External
};

interface MockWallet {
  wallet: BaseWallet;
  address: Cardano.PaymentAddress;
  keyAgent: KeyManagement.InMemoryKeyAgent;
}

export const rewardAccountInfoProviderStub = (): RewardAccountInfoProvider => {
  throw new Error('TODO: not implemented');
};

export const mockWallet = async (customKeyAgent?: KeyManagement.InMemoryKeyAgent): Promise<MockWallet> => {
  const keyAgent = customKeyAgent ?? (await testKeyAgent());
  const assetProvider = assetsProviderStub();
  const networkInfoProvider = networkInfoProviderStub();
  keyAgent.deriveAddress = jest.fn().mockResolvedValue({
    address,
    rewardAccount
  });
  const utxoProvider = utxoProviderStub();
  const chainHistoryProvider = chainHistoryProviderStub();
  const rewardsProvider = rewardsHistoryProviderStub();
  // eslint-disable-next-line sonarjs/no-use-of-empty-return-value
  const rewardAccountInfoProvider = rewardAccountInfoProviderStub();
  const asyncKeyAgent = KeyManagement.util.createAsyncKeyAgent(keyAgent);
  const wallet = createPersonalWallet(
    { name },
    {
      assetProvider,
      networkInfoProvider,
      stores: storage.createInMemoryWalletStores(),
      txSubmitProvider: TxSubmitProviderFake.make(),
      rewardsProvider,
      chainHistoryProvider,
      utxoProvider,
      rewardAccountInfoProvider,
      logger,
      witnesser: KeyManagement.util.createBip32Ed25519Witnesser(asyncKeyAgent),
      bip32Account: new KeyManagement.Bip32Account(keyAgent)
    }
  );

  // Add more to the response if needed
  return { wallet, address, keyAgent };
};

export const mockObservableWallet = {
  addresses$: of([knownAddresses]),
  assetInfo$: of(new Map()),
  balance: {
    rewardAccounts: {
      deposit$: of(BigInt(0)),
      rewards$: of(BigInt(0))
    },
    utxo: {
      available$: of({ coins: BigInt(0) } as Cardano.Value),
      total$: of({ coins: BigInt(0) } as Cardano.Value),
      unspendable$: of({ coins: BigInt(0) } as Cardano.Value)
    }
  },
  getName: async () => 'wallet-name',
  tip$: of({
    blockNo: Cardano.BlockNo(500),
    hash: Cardano.BlockId('96fbe9b0d4930626fc87ea7f1b6360035e9b8a714e9514f1b836190e95edd59e'),
    slot: Cardano.Slot(3000)
  } as Cardano.PartialBlockHeader),
  transactions: { history$: of(queryTransactionsResult) }
} as ObservableWallet;
