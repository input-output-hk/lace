/* eslint-disable no-magic-numbers */
import { Cardano } from '@cardano-sdk/core';
import { createStubStakePoolProvider } from '@cardano-sdk/util-dev';
import { ObservableWallet, SingleAddressWallet, storage } from '@cardano-sdk/wallet';
import * as KeyManagement from '../../../../../../node_modules/@cardano-sdk/key-management/dist/cjs';
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
  wallet: SingleAddressWallet;
  address: Cardano.PaymentAddress;
  keyAgent: KeyManagement.InMemoryKeyAgent;
}

export const mockWallet = async (customKeyAgent?: KeyManagement.InMemoryKeyAgent): Promise<MockWallet> => {
  const keyAgent = customKeyAgent ?? (await testKeyAgent());
  const assetProvider = assetsProviderStub();
  const stakePoolProvider = createStubStakePoolProvider();
  const networkInfoProvider = networkInfoProviderStub();
  keyAgent.deriveAddress = jest.fn().mockResolvedValue({
    address,
    rewardAccount
  });
  keyAgent.knownAddresses = [knownAddresses];
  const utxoProvider = utxoProviderStub();
  const chainHistoryProvider = chainHistoryProviderStub();
  const rewardsProvider = rewardsHistoryProviderStub();
  const wallet = new SingleAddressWallet(
    { name },
    {
      assetProvider,
      keyAgent: KeyManagement.util.createAsyncKeyAgent(keyAgent),
      stakePoolProvider,
      networkInfoProvider,
      stores: storage.createInMemoryWalletStores(),
      txSubmitProvider: TxSubmitProviderFake.make(),
      rewardsProvider,
      chainHistoryProvider,
      utxoProvider,
      logger
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
