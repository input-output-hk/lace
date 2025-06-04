/* eslint-disable no-magic-numbers */
import { Cardano, RewardAccountInfoProvider } from '@cardano-sdk/core';
import { ObservableWallet, BaseWallet, createPersonalWallet, storage } from '@cardano-sdk/wallet';
import * as KeyManagement from '@cardano-sdk/key-management';
import * as Crypto from '@cardano-sdk/crypto';
import { assetsProviderStub } from './AssetsProviderStub';
import { networkInfoProviderStub } from './NetworkInfoProviderStub';
import { queryTransactionsResult, rewardAccount } from './ProviderStub';
import { testKeyAgent } from './TestKeyAgent';
import { TxSubmitProviderFake } from '@wallet/test/mocks/TxSubmitProviderFake';
import { utxoProviderStub } from './UtxoProviderStub';
import { chainHistoryProviderStub } from './ChainHistoryProviderStub';
import { rewardsHistoryProviderStub } from './RewardsProviderStub';
import { of } from 'rxjs';
import { handleProviderStub } from './HandleProviderStub';

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

export const rewardAccountInfoProviderStub = (): RewardAccountInfoProvider => ({
  healthCheck: jest.fn().mockResolvedValue({ ok: true }),
  rewardAccountInfo: jest.fn().mockResolvedValue({
    address,
    credentialStatus: Cardano.StakeCredentialStatus.Registered,
    rewardBalance: BigInt(1_000_000)
  }),
  delegationPortfolio: () =>
    new Promise<Cardano.Cip17DelegationPortfolio | null>((resolve) => {
      // eslint-disable-next-line unicorn/no-null
      resolve(null);
    })
});

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
  const handleProvider = handleProviderStub();

  const bip32Ed25519 = await Crypto.SodiumBip32Ed25519.create();
  const dependencies = { bip32Ed25519, blake2b: Crypto.blake2b, logger };
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
      handleProvider,
      logger,
      witnesser: KeyManagement.util.createBip32Ed25519Witnesser(asyncKeyAgent),
      bip32Account: new KeyManagement.Bip32Account(keyAgent, dependencies)
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
