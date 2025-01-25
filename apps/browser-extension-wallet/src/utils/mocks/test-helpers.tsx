/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable sonarjs/no-duplicate-string */
/* eslint-disable max-len, @typescript-eslint/no-explicit-any, no-magic-numbers, new-cap */
import React, { FunctionComponent } from 'react';
import { Wallet } from '@lace/cardano';
import { SendStoreProvider } from '../../features/send/stores';
import { createSignal } from '@react-rxjs/utils';
import { Balance, CardanoTxBuild, WalletInfo, TxDirection, TransactionActivityDetail } from '@types';
import { DisplayedCoinDetail, IAssetInfo } from '../../features/send/types';
import { APP_MODE_POPUP, cardanoCoin } from '../constants';
import { fakeApiRequest } from './fake-api-request';
// eslint-disable-next-line import/no-unresolved
import { EMPTY, Observable, of, Subject } from 'rxjs';
import { PriceResult } from '@hooks';
import { Percent } from '@cardano-sdk/util';
import { UserIdService } from '@lib/scripts/types';
import { PostHogClient } from '@providers/PostHogClientProvider/client';
import { AnalyticsTracker } from '@providers/AnalyticsProvider/analyticsTracker';
import { ObservableWalletState } from '@hooks/useWalletState';
import { Cardano } from '@cardano-sdk/core';

export const mockWalletInfoTestnet: WalletInfo = {
  name: 'testnet wallet',
  addresses: [
    {
      address: Wallet.Cardano.PaymentAddress(
        'addr_test1qz2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3jcu5d8ps7zex2k2xt3uqxgjqnnj83ws8lhrn648jjxtwq2ytjqp'
      ),
      rewardAccount: Wallet.Cardano.RewardAccount('stake_test1uqrw9tjymlm8wrwq7jk68n6v7fs9qz8z0tkdkve26dylmfc2ux2hj')
    }
  ] as Wallet.KeyManagement.GroupedAddress[]
};

export const mockKeyAgentDataTestnet: Wallet.KeyManagement.SerializableKeyAgentData = {
  __typename: Wallet.KeyManagement.KeyAgentType.InMemory,
  accountIndex: 0,
  encryptedRootPrivateKeyBytes: [],
  // eslint-disable-next-line no-magic-numbers
  extendedAccountPublicKey: Wallet.Crypto.Bip32PublicKeyHex('0'.repeat(128)),
  chainId: Wallet.Cardano.ChainIds.Preprod
};

export const mockKeyAgentsByChain = {
  Mainnet: { keyAgentData: { ...mockKeyAgentDataTestnet, chainId: Wallet.Cardano.ChainIds.Mainnet } },
  Preprod: { keyAgentData: { ...mockKeyAgentDataTestnet, chainId: Wallet.Cardano.ChainIds.Preprod } },
  Preview: { keyAgentData: { ...mockKeyAgentDataTestnet, chainId: Wallet.Cardano.ChainIds.Preview } },
  Sanchonet: { keyAgentData: { ...mockKeyAgentDataTestnet, chainId: Wallet.Cardano.ChainIds.Sanchonet } }
};

export const mockWalletState: ObservableWalletState = {
  protocolParameters: { poolDeposit: 3, stakeKeyDeposit: 2 } as Cardano.ProtocolParameters,
  transactions: {
    history: [
      {
        id: Wallet.Cardano.TransactionId('724a0a88b9470a714fc5bf84daf5851fa259a9b89e1a5453f6f5cd6595ad9827'),
        blockHeader: {
          blockNo: 3_386_052,
          hash: Wallet.Cardano.BlockId('07d34cac1e15b00d6236564dcd5b053c96451bf0a58f3adf5982c91f7ff99f60'),
          slot: 52_633_369
        },
        body: {
          outputs: [
            {
              address: Wallet.Cardano.PaymentAddress(
                'addr_test1qz2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3jcu5d8ps7zex2k2xt3uqxgjqnnj83ws8lhrn648jjxtwq2ytjqp'
              ),
              value: { assets: new Map(), coins: BigInt(1) }
            },
            {
              address: Wallet.Cardano.PaymentAddress(
                'addr_test1qpeg0n942wz3kx7vhmcgwa9t58r9spp4x2x32vfllm4ddkj2he0ldswjwtvp7drsjqmyzugmjhmypdhu3vez5rkkuj5s74q4yw'
              ),
              value: { assets: new Map(), coins: BigInt(1) }
            }
          ],
          inputs: [
            {
              txId: Wallet.Cardano.TransactionId('724a0a88b9470a714fc5bf84daf5851fa259a9b89e1a5453f6f5cd6595ad9827'),
              address: Wallet.Cardano.PaymentAddress(
                'addr_test1qz2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3jcu5d8ps7zex2k2xt3uqxgjqnnj83ws8lhrn648jjxtwq2ytjqp'
              ),
              index: 0,
              value: { assets: new Map(), coins: BigInt(200) }
            }
          ],
          fee: BigInt(100_000)
        }
      } as unknown as Wallet.Cardano.HydratedTx
    ],
    outgoing: {
      inFlight: []
    }
  },
  eraSummaries: Wallet.testnetEraSummaries,
  currentEpoch: {
    epochNo: Wallet.Cardano.EpochNo(286),
    lastSlot: {
      date: new Date(1_635_435_561_134 + 30_000),
      slot: Cardano.Slot(10)
    },
    firstSlot: {
      date: new Date(1_635_435_561_134),
      slot: Cardano.Slot(1)
    }
  },
  assetInfo: new Map(),
  delegation: {
    rewardsHistory: {
      all: []
    }
  } as ObservableWalletState['delegation'],
  addresses: []
} as ObservableWalletState;

export const mockInMemoryWallet = {
  protocolParameters$: of(mockWalletState.protocolParameters),
  transactions: {
    rollback$: EMPTY,
    history$: of(mockWalletState.transactions.history),
    new$: EMPTY,
    outgoing: {
      submitting$: EMPTY,
      inFlight$: of([]),
      failed$: EMPTY,
      onChain$: EMPTY,
      pending$: EMPTY,
      signed$: EMPTY
    }
  } as Wallet.ObservableWallet['transactions'],
  eraSummaries$: of(mockWalletState.eraSummaries),
  currentEpoch$: of(mockWalletState.currentEpoch),
  assetInfo$: of(mockWalletState.assetInfo),
  delegation: {
    rewardsHistory$: of(mockWalletState.delegation.rewardsHistory)
  },
  addresses$: of(mockWalletState.addresses)
} as Wallet.ObservableWallet;

export const mockWalletUI = {
  appMode: APP_MODE_POPUP,
  cardanoCoin
};

export const getSendStoreContext =
  (): FunctionComponent =>
  ({ children }: { children?: React.ReactNode }) =>
    <SendStoreProvider>{children}</SendStoreProvider>;

export const mockPersonalWallet = {
  addresses$: createSignal<any>()[0],
  assets$: createSignal<any>()[0],
  balance: {
    utxo: {
      available$: createSignal<any>()[0],
      total$: createSignal<any>()[0],
      unspendable$: createSignal<any>()[0]
    },
    rewardAccounts: {
      deposit$: createSignal<any>()[0],
      rewards$: createSignal<any>()[0]
    }
  },
  transactions: {
    rollback$: createSignal<any>()[0],
    history$: createSignal<any>()[0],
    outgoing: {
      inFlight$: createSignal<any>()[0],
      submitting$: createSignal<any>()[0],
      pending$: createSignal<any>()[0],
      failed$: createSignal<any>()[0],
      confirmed$: createSignal<any>()[0]
    },
    shutdown: jest.fn()
  },
  delegation: {
    rewardsHistory$: createSignal<any>()[0],
    rewardAccounts$: createSignal<any>()[0],
    shutdown: jest.fn()
  },
  tip$: createSignal<any>()[0],
  utxo: {
    shutdown: jest.fn(),
    total$: createSignal<any>()[0],
    available$: createSignal<any>()[0],
    unspendable$: createSignal<any>()[0]
  },
  protocolParameters$: createSignal<any>()[0],
  genesisParameters$: createSignal<any>()[0],
  sync: jest.fn(),
  shutdown: jest.fn(),
  name: 'Test Wallet',
  initializeTx: jest.fn(),
  finalizeTx: jest.fn(),
  submitTx: jest.fn()
};

export const mockAvailableBalance: Balance = {
  utxo: {
    total$: of({
      coins: BigInt('10000000'),
      assets: new Map([
        [Wallet.Cardano.AssetId('659f2917fb63f12b33667463ee575eeac1845bbc736b9c0bbc40ba8254534c41'), BigInt('1000000')]
      ])
    }),
    available$: of({
      coins: BigInt('10000000'),
      assets: new Map([
        [Wallet.Cardano.AssetId('659f2917fb63f12b33667463ee575eeac1845bbc736b9c0bbc40ba8254534c41'), BigInt('1000000')]
      ])
    }),
    unspendable$: new Observable()
  },
  rewardAccounts: {
    rewards$: of(BigInt('1000000')),
    deposit$: of(BigInt('1000000'))
  }
};

export const mockAssetMetadata: Wallet.Asset.AssetInfo = {
  assetId: Wallet.Cardano.AssetId('659f2917fb63f12b33667463ee575eeac1845bbc736b9c0bbc40ba8254534c41'),
  fingerprint: Wallet.Cardano.AssetFingerprint('asset1pkpwyknlvul7az0xx8czhl60pyel45rpje4z8w'),
  name: Wallet.Cardano.AssetName('54534c41'),
  policyId: Wallet.Cardano.PolicyId('659f2917fb63f12b33667463ee575eeac1845bbc736b9c0bbc40ba82'),
  quantity: BigInt('1000'),
  supply: BigInt('1000')
};

export const mockDisplayedCoins: DisplayedCoinDetail[] = [
  {
    amount: '0',
    coinId: '1'
  }
];

export const mockAssetInfo: IAssetInfo[] = [
  {
    id: cardanoCoin.id,
    balance: Wallet.util.lovelacesToAdaString('10000000'),
    symbol: cardanoCoin.symbol
  },
  {
    id: '659f2917fb63f12b33667463ee575eeac1845bbc736b9c0bbc40ba8254534c41',
    balance: '1000000',
    symbol: 'assetid'
  }
];

export const cardanoStakePoolStats: Wallet.StakePoolStats = {
  qty: {
    activating: 0,
    active: 1,
    retired: 0,
    retiring: 0
  }
};

export const cardanoStakePoolMock: Wallet.StakePoolSearchResults = {
  pageResults: [
    {
      cost: BigInt('6040000'),
      hexId: Wallet.Cardano.PoolIdHex('a76e3a1104a9d816a67d5826a155c9e2979a839d0d944346d47e33ab'),
      id: Wallet.Cardano.PoolId('pool1syqhydhdzcuqhwtt6q4m63f9g8e7262wzsvk7e0r0njsyjyd0yn'),
      margin: {
        denominator: 50,
        numerator: 1
      },
      metadata: {
        homepage: 'http://www.sttst.com',
        name: 'StakedTestPool',
        ticker: 'STTST',
        description: 'This is the STTST description',
        ext: {
          serial: 1,
          pool: {
            id: Wallet.Cardano.PoolIdHex('a76e3a1104a9d816a67d5826a155c9e2979a839d0d944346d47e33ab')
          }
        }
      },
      metrics: {
        blocksCreated: 20,
        delegators: 20,
        livePledge: BigInt('2000000000'),
        saturation: Percent(0.0512),
        stake: undefined,
        size: undefined,
        ros: Percent(0.69),
        lastRos: Percent(0.88)
      },
      owners: [
        Wallet.Cardano.RewardAccount('stake_test1uqrw9tjymlm8wrwq7jk68n6v7fs9qz8z0tkdkve26dylmfc2ux2hj'),
        Wallet.Cardano.RewardAccount('stake_test1uq7g7kqeucnqfweqzgxk3dw34e8zg4swnc7nagysug2mm4cm77jrx')
      ],
      pledge: BigInt('2000000000'),
      rewardAccount: Wallet.Cardano.RewardAccount('stake_test1uqrw9tjymlm8wrwq7jk68n6v7fs9qz8z0tkdkve26dylmfc2ux2hj'),
      status: Wallet.Cardano.StakePoolStatus.Active,
      vrf: undefined,
      relays: undefined
    }
  ],
  totalResultCount: 1
};

const newTransactionBody: Wallet.Cardano.TxBody = {
  fee: BigInt('168273'),
  inputs: [
    {
      index: 1,
      txId: Wallet.Cardano.TransactionId('6a9856c4f286ae3fd01256de9f05390e3b1bc6e8278806235053b49ac1c33608')
    }
  ],
  outputs: [
    {
      address: Wallet.Cardano.PaymentAddress(
        'addr_test1qrrx8s34r6m0w835qe9tj8mqa4ugkwhllw5l4hwpmhakpy8hukqufzmfnrvvr24tschssxw96z8dq9dz09xkg9eghtkqe07423'
      ),
      value: {
        coins: BigInt('3000000'),
        assets: new Map([
          [Wallet.Cardano.AssetId('6b8d07d69639e9413dd637a1a815a7323c69c86abbafb66dbfdb1aa7'), BigInt('3000000')]
        ]) as Wallet.Cardano.TokenMap
      }
    }
  ],
  validityInterval: {
    invalidHereafter: Wallet.Cardano.Slot(44_094_741)
  }
};

const confirmedTransactionBody: Wallet.Cardano.HydratedTxBody = {
  fee: newTransactionBody.fee,
  outputs: newTransactionBody.outputs,
  validityInterval: newTransactionBody.validityInterval,
  inputs: newTransactionBody.inputs.map((input) => ({
    ...input,
    address: Wallet.Cardano.PaymentAddress(
      'addr_test1qrrx8s34r6m0w835qe9tj8mqa4ugkwhllw5l4hwpmhakpy8hukqufzmfnrvvr24tschssxw96z8dq9dz09xkg9eghtkqe07423'
    )
  }))
};

export const TransactionBuildMock: CardanoTxBuild = {
  inputSelection: undefined,
  body: newTransactionBody,
  hash: Wallet.Cardano.TransactionId('3af346b984dc9864c04656680928ae73c0f10eed7a48ac8d9fc1846bf350eb25')
};

export const mockAsset: Wallet.Asset.AssetInfo = {
  assetId: Wallet.Cardano.AssetId('6b8d07d69639e9413dd637a1a815a7323c69c86abbafb66dbfdb1aa7'),
  fingerprint: Wallet.Cardano.AssetFingerprint('asset1cvmyrfrc7lpht2hcjwr9lulzyyjv27uxh3kcz0'),
  name: Wallet.Cardano.AssetName('54657374636f696e'),
  policyId: Wallet.Cardano.PolicyId('6b8d07d69639e9413dd637a1a815a7323c69c86abbafb66dbfdb1aa7'),
  quantity: BigInt('100042'),
  supply: BigInt('100042'),
  tokenMetadata: {
    assetId: Wallet.Cardano.AssetId('6b8d07d69639e9413dd637a1a815a7323c69c86abbafb66dbfdb1aa7'),
    decimals: undefined,
    desc: 'Testcoin crypto powered by Cardano testnet.',
    icon: undefined,
    name: 'Testcoin',
    ticker: 'TEST',
    url: 'https://developers.cardano.org/'
  }
};

export const mockNft: Wallet.Asset.AssetInfo = {
  assetId: Wallet.Cardano.AssetId('659f2917fb63f12b33667463ee575eeac1845bbc736b9c0bbc40ba8254534c41'),
  fingerprint: Wallet.Cardano.AssetFingerprint('asset1pkpwyknlvul7az0xx8czhl60pyel45rpje4z8w'),
  name: Wallet.Cardano.AssetName('54534c41'),
  policyId: Wallet.Cardano.PolicyId('659f2917fb63f12b33667463ee575eeac1845bbc736b9c0bbc40ba82'),
  quantity: BigInt(1),
  supply: BigInt(1),
  tokenMetadata: {
    assetId: Wallet.Cardano.AssetId('659f2917fb63f12b33667463ee575eeac1845bbc736b9c0bbc40ba8254534c41'),
    decimals: undefined,
    desc: 'Mock NFT',
    icon: undefined,
    name: 'Fake NFT',
    ticker: 'NFT',
    url: 'https://nft.mock.xyz/'
  },
  nftMetadata: {
    image: Wallet.Asset.Uri('ipfs://asd.io'),
    name: 'NFT #123456',
    version: '2',
    description: 'NFT MOCK'
  }
};

export const transactionMock: {
  direction: TxDirection;
  tx: Wallet.Cardano.HydratedTx;
} = {
  direction: 'Incoming',
  tx: {
    ...TransactionBuildMock,
    id: Wallet.Cardano.TransactionId('e6eb1c8c806ae7f4d9fe148e9c23853607ffba692ef0a464688911ad3374a932'),
    index: 19,
    witness: {
      redeemers: undefined,
      signatures: new Map()
    },
    txSize: 297,
    auxiliaryData: {
      blob: new Map()
    },
    blockHeader: {
      hash: Wallet.Cardano.BlockId('96fbe9b0d4930626fc87ea7f1b6360035e9b8a714e9514f1b836190e95edd59e'),
      blockNo: Wallet.Cardano.BlockNo(3_114_963),
      slot: Wallet.Cardano.Slot(43_905_372)
    },
    body: confirmedTransactionBody,
    inputSource: Wallet.Cardano.InputSource.inputs
  }
};

export const blockMock: Wallet.BlockInfo = {
  confirmations: 17_013,
  epoch: Wallet.Cardano.EpochNo(171),
  epochSlot: 403_008,
  fees: BigInt('3137154'),
  nextBlock: Wallet.Cardano.BlockId('61886f1daff5d3730c159fda35e86a630ee0272f6f8f5e141f5eacf8e99fb591'),
  previousBlock: Wallet.Cardano.BlockId('96fbe9b0d4930626fc87ea7f1b6360035e9b8a714e9514f1b836190e95edd59e'),
  size: Wallet.Cardano.BlockSize(4719),
  slotLeader: Wallet.Cardano.PoolId('pool1zuevzm3xlrhmwjw87ec38mzs02tlkwec9wxpgafcaykmwg7efhh'),
  totalOutput: BigInt('10579315393456'),
  txCount: 18,
  vrf: Wallet.Cardano.VrfVkBech32('vrf_vk19j362pkr4t9y0m3qxgmrv0365vd7c4ze03ny4jh84q8agjy4ep4s99zvg8'),
  header: {
    hash: Wallet.Cardano.BlockId('717ca157f1e696a612af87109ba1f30cd4bb311ded5b504c78a6face463def95'),
    blockNo: Wallet.Cardano.BlockNo(3_114_964),
    slot: Wallet.Cardano.Slot(43_905_408)
  },
  // eslint-disable-next-line no-magic-numbers
  date: new Date(1_638_829_263_730)
};

export const formatBlockMock: TransactionActivityDetail['blocks'] = {
  block: '3114964',
  blockId: '717ca157f1e696a612af87109ba1f30cd4bb311ded5b504c78a6face463def95',
  confirmations: '17013',
  createdBy: 'pool1zuevzm3xlrhmwjw87ec38mzs02tlkwec9wxpgafcaykmwg7efhh',
  utcDate: '12/06/2021',
  epoch: '171',
  nextBlock: '3114965',
  prevBlock: '3114963',
  size: '4719',
  slot: '43905408',
  utcTime: '22:21:03 UTC',
  transactions: '18'
};

export const formatTransaction = {
  hash: 'e6eb1c8c806ae7f4d9fe148e9c23853607ffba692ef0a464688911ad3374a932',
  totalOutput: '2.83 ₳',
  fee: '0.17 ₳',
  addrInputs: [
    {
      addr: 'addr_test1qrrx8s34r6m0w835qe9tj8mqa4ugkwhllw5l4hwpmhakpy8hukqufzmfnrvvr24tschssxw96z8dq9dz09xkg9eghtkqe07423',
      amount: '3.00 ₳',
      assetList: [
        {
          id: '6b8d07d69639e9413dd637a1a815a7323c69c86abbafb66dbfdb1aa7',
          amount: '3000000',
          name: 'Testcoin',
          symbol: 'TEST'
        }
      ]
    }
  ],
  addrOutputs: [
    {
      addr: 'addr_test1qrrx8s34r6m0w835qe9tj8mqa4ugkwhllw5l4hwpmhakpy8hukqufzmfnrvvr24tschssxw96z8dq9dz09xkg9eghtkqe07423',
      amount: '3.00 ₳',
      assetList: [
        {
          id: '6b8d07d69639e9413dd637a1a815a7323c69c86abbafb66dbfdb1aa7',
          amount: '3000000',
          name: 'Testcoin',
          symbol: 'TEST'
        }
      ]
    }
  ],
  includedDate: '2021-12-06',
  includedTime: '22:21:03'
};

export const assetProviderMock: Wallet.AssetProvider = {
  getAsset: () => fakeApiRequest(mockAsset),
  getAssets: () => fakeApiRequest([mockAsset]),
  healthCheck: () => Promise.resolve({ ok: true })
};

export const mockStakepoolProvider: Wallet.StakePoolProvider = {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  queryStakePools: (_options?: Wallet.QueryStakePoolsArgs) => fakeApiRequest(cardanoStakePoolMock),
  stakePoolStats: () => fakeApiRequest(cardanoStakePoolStats),
  healthCheck: () => Promise.resolve({ ok: true })
};

export const outgoingTransactionOutput: any = {
  outputs: [
    {
      amount: '3.00',
      assetList: [],
      addr: 'addr_test1qphhr294v0w0rzgk7kz4ynsp8hwt82ha6nsp8yk6h04fhzsuryus5g7pm3lq85msee5pdtqlnv2crdc83kk2tvhsefcsu2snle'
    },
    {
      amount: '279.05',
      assetList: [],
      addr: 'addr_test1qpuzeec0zqcm6lrdygkkvvd8e6qactnsl5zzeujsdpkpc939l2f2vykk0ctwq4ys6w3jg8pm0kknmy8m5pml8f9cauzq2zuc95'
    }
  ],
  walletAddresses: [
    'addr_test1qpuzeec0zqcm6lrdygkkvvd8e6qactnsl5zzeujsdpkpc939l2f2vykk0ctwq4ys6w3jg8pm0kknmy8m5pml8f9cauzq2zuc95'
  ],
  incomingTransaction: false
};

export const incomingTransactionOutput: any = {
  inputs: [
    {
      amount: '58389439.54',
      assetList: [],
      addr: 'addr_test1qphhr294v0w0rzgk7kz4ynsp8hwt82ha6nsp8yk6h04fhzsuryus5g7pm3lq85msee5pdtqlnv2crdc83kk2tvhsefcsu2snle'
    }
  ],
  outputs: [
    {
      amount: '1000.00',
      assetList: [],
      addr: 'addr_test1qpuzeec0zqcm6lrdygkkvvd8e6qactnsl5zzeujsdpkpc939l2f2vykk0ctwq4ys6w3jg8pm0kknmy8m5pml8f9cauzq2zuc95'
    },
    {
      amount: '58389439.54',
      assetList: [],
      addr: 'addr_test1qqt3r9kd56aq9ajynjkz8hdfw3kc0pcv3tpzug8azxls62tvvz7nw9gmznn65g4ksrrfvyzhz52knc3mqxdyya47gz2qmcjmcq'
    }
  ],
  walletAddresses: [
    'addr_test1qpuzeec0zqcm6lrdygkkvvd8e6qactnsl5zzeujsdpkpc939l2f2vykk0ctwq4ys6w3jg8pm0kknmy8m5pml8f9cauzq2zuc95'
  ],
  incomingTransaction: true
};

export const missingDataTransactionOutput: any = {
  outputs: [],
  walletAddress: '',
  incomingTransaction: false
};

export const cardanoStakePoolSelectedDetails = {
  contact: {
    primary: 'http://www.sttst.com'
  },
  delegators: '20',
  description: 'This is the STTST description',
  fee: '6.04',
  hexId: 'a76e3a1104a9d816a67d5826a155c9e2979a839d0d944346d47e33ab',
  id: 'pool1syqhydhdzcuqhwtt6q4m63f9g8e7262wzsvk7e0r0njsyjyd0yn',
  logo: 'data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2230%22%20height%3D%2230%22%20viewBox%3D%220%200%2030%2030%22%3E%3Cpath%20fill%3D%22%23e3e3e3%22%20d%3D%22M15%209L9%209L9%206ZM15%209L15%203L18%203ZM15%2021L21%2021L21%2024ZM15%2021L15%2027L12%2027ZM9%2015L3%2015L3%2012ZM21%2015L21%209L24%209ZM21%2015L27%2015L27%2018ZM9%2015L9%2021L6%2021Z%22%2F%3E%3Cpath%20fill%3D%22%23464646%22%20d%3D%22M3%206L6%203L9%206L6%209ZM24%203L27%206L24%209L21%206ZM27%2024L24%2027L21%2024L24%2021ZM6%2027L3%2024L6%2021L9%2024Z%22%2F%3E%3Cpath%20fill%3D%22%23599ec7%22%20d%3D%22M11%2011L15%2011L15%2015L11%2015ZM19%2011L19%2015L15%2015L15%2011ZM19%2019L15%2019L15%2015L19%2015ZM11%2019L11%2015L15%2015L15%2019Z%22%2F%3E%3C%2Fsvg%3E',
  margin: '2.00',
  name: 'StakedTestPool',
  owners: [
    'stake_test1uqrw9tjymlm8wrwq7jk68n6v7fs9qz8z0tkdkve26dylmfc2ux2hj',
    'stake_test1uq7g7kqeucnqfweqzgxk3dw34e8zg4swnc7nagysug2mm4cm77jrx'
  ],
  saturation: '5.12',
  ros: '69.00',
  status: 'active',
  ticker: 'STTST',
  blocks: '20',
  pledge: '2000.00'
};

export const transformedStakePool = {
  cost: '2.00% + 6ADA',
  description: 'This is the STTST description',
  fee: '6.04',
  hexId: 'a76e3a1104a9d816a67d5826a155c9e2979a839d0d944346d47e33ab',
  id: 'pool1syqhydhdzcuqhwtt6q4m63f9g8e7262wzsvk7e0r0njsyjyd0yn',
  logo: 'data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2230%22%20height%3D%2230%22%20viewBox%3D%220%200%2030%2030%22%3E%3Cpath%20fill%3D%22%23e3e3e3%22%20d%3D%22M15%209L9%209L9%206ZM15%209L15%203L18%203ZM15%2021L21%2021L21%2024ZM15%2021L15%2027L12%2027ZM9%2015L3%2015L3%2012ZM21%2015L21%209L24%209ZM21%2015L27%2015L27%2018ZM9%2015L9%2021L6%2021Z%22%2F%3E%3Cpath%20fill%3D%22%23464646%22%20d%3D%22M3%206L6%203L9%206L6%209ZM24%203L27%206L24%209L21%206ZM27%2024L24%2027L21%2024L24%2021ZM6%2027L3%2024L6%2021L9%2024Z%22%2F%3E%3Cpath%20fill%3D%22%23599ec7%22%20d%3D%22M11%2011L15%2011L15%2015L11%2015ZM19%2011L19%2015L15%2015L15%2011ZM19%2019L15%2019L15%2015L19%2015ZM11%2019L11%2015L15%2015L15%2019Z%22%2F%3E%3C%2Fsvg%3E',
  margin: '2.00',
  name: 'StakedTestPool',
  owners: [
    'stake_test1uqrw9tjymlm8wrwq7jk68n6v7fs9qz8z0tkdkve26dylmfc2ux2hj',
    'stake_test1uq7g7kqeucnqfweqzgxk3dw34e8zg4swnc7nagysug2mm4cm77jrx'
  ],
  pledge: '2000.00ADA',
  retired: false,
  saturation: '5.12',
  size: '- %',
  ticker: 'STTST'
};

export const mockAssetDetails = {
  id: 'f6f49b186751e61f1fb8c64e7504e771f968cea9f4d11f5222b169e374484f534b59',
  logo: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABkAAAAYCAMAAAA4a6b0AAACKFBMVEUAAAD////////////v7+/y8vLy8vLz8/P4+Pj4+Pjy8vL19fX19fX29vb29vb29vb29vb29vb19fX19fX29vb09PT19fX19fX19fX29vb29vb09PT09PT09PT19fX29vb09PT09PT09PT19fX19fX19fX19fX19fX19fX19fX19fX29vb29vb19fX19fX19fX19fX29vb19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fUQEBAUFBQXFxcaGhobGxsfHx8gICAjIyMkJCQuLi4wMDAzMzM1NTU5OTk8PDw+Pj4/Pz9ERERIRkdISEhKSkpLS0tPT09QUFBUVFRWVlZhYWFjYGFjY2NlZWVlZ2toaGhpaWlqampra2ttbW1ycnJ0dHR3d3d6enp+iJV+kq5/f3+BgYGCgoKDg4OFgoOJdHuRkZGSkpKTk5OVlZWXl5eYmJicnJyekpaenp6fn5+hoaGioqKjo6OlpaWmpqanp6eoqKipqamrq6usrKyulJqurq6uuMawsLCysrK0tLS0vsy1tbW2k522tra2v8q8vLy9vb2+vr6/v7/BkJ7BwcHCwsLExMTGxsbHx8fKysrLy8vMzMzNzc3N0NPR0dHR1NjS0tLU1NTV1dXW1tbY2NjZ2dna3eHc3Nzd3d3em67g4ODh4eHi4uLj4+Pk5OTl5eXm5ubo6Ojs7Ozv7+/x8fHy8vL19fW4Q7oaAAAAQXRSTlMAAQgKEBMUFSUmJzIzNjg5OjtJS1NhY2ZpbW91d3l7jI2OkZWZqq2wt7i7vL7R0tXW19vc4eLm5+/w9vf4+fr7/sRRB5kAAAABYktHRAH/Ai3eAAABwUlEQVQYGVXBhz+UcRzA8S+KUpraQyUtLU1cF19yjUuhlHZaCmlKqcsqSSVcRkZ19/BEKfk1Pv9ejxdeeL9lTOTyzTuTk7avXxghk0TGpTLKvTZCxi3ezwR7Z8uYVTB40cuwksw22BctI5aCVWbfawe+l1vP/eCKkmEzU+B+W2AoH6hvCP48A+wOE0c8fK4Mdg3lA/UNQavlKbBSROYCzdV2d3+6x+PJqLK67QIgKVRkNdBc0deXdsSrGSe1qccuwDFfJAFovtyY7W1/oDnBK1rzqABHrIS44V+uqtrGp6fM4FnVoy3ARgkH/qrja+H7q58K39xQ1Qpgq0wFstTx5VaVCV56dUEdNmyREBdkaU5xsc+0+mpNoKjonKoNG0QSIEtLrX5jrmumMQN9flUbYkVioCPN2/jLmIC/3Rhj5WnJH5gnMgc4qJUDvbfvnDhfVz7UqQdqIDFURDaBdVxfDDy5++1D3uDHY4fLgBXimJECrdn6uunxu5elHbnpZcCuMBm2BOioOlTX6XsbOH2zFnBFyYgYHL3PHv7outbzG3BFy5hFbibYM0vGTY9LZZR7zRSZZNqy+B3JidvWLQiXEf8BSrjtcYUwJvwAAAAASUVORK5CYII=',
  defaultLogo:
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABkAAAAYCAMAAAA4a6b0AAACKFBMVEUAAAD////////////v7+/y8vLy8vLz8/P4+Pj4+Pjy8vL19fX19fX29vb29vb29vb29vb29vb19fX19fX29vb09PT19fX19fX19fX29vb29vb09PT09PT09PT19fX29vb09PT09PT09PT19fX19fX19fX19fX19fX19fX19fX19fX29vb29vb19fX19fX19fX19fX29vb19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fUQEBAUFBQXFxcaGhobGxsfHx8gICAjIyMkJCQuLi4wMDAzMzM1NTU5OTk8PDw+Pj4/Pz9ERERIRkdISEhKSkpLS0tPT09QUFBUVFRWVlZhYWFjYGFjY2NlZWVlZ2toaGhpaWlqampra2ttbW1ycnJ0dHR3d3d6enp+iJV+kq5/f3+BgYGCgoKDg4OFgoOJdHuRkZGSkpKTk5OVlZWXl5eYmJicnJyekpaenp6fn5+hoaGioqKjo6OlpaWmpqanp6eoqKipqamrq6usrKyulJqurq6uuMawsLCysrK0tLS0vsy1tbW2k522tra2v8q8vLy9vb2+vr6/v7/BkJ7BwcHCwsLExMTGxsbHx8fKysrLy8vMzMzNzc3N0NPR0dHR1NjS0tLU1NTV1dXW1tbY2NjZ2dna3eHc3Nzd3d3em67g4ODh4eHi4uLj4+Pk5OTl5eXm5ubo6Ojs7Ozv7+/x8fHy8vL19fW4Q7oaAAAAQXRSTlMAAQgKEBMUFSUmJzIzNjg5OjtJS1NhY2ZpbW91d3l7jI2OkZWZqq2wt7i7vL7R0tXW19vc4eLm5+/w9vf4+fr7/sRRB5kAAAABYktHRAH/Ai3eAAABwUlEQVQYGVXBhz+UcRzA8S+KUpraQyUtLU1cF19yjUuhlHZaCmlKqcsqSSVcRkZ19/BEKfk1Pv9ejxdeeL9lTOTyzTuTk7avXxghk0TGpTLKvTZCxi3ezwR7Z8uYVTB40cuwksw22BctI5aCVWbfawe+l1vP/eCKkmEzU+B+W2AoH6hvCP48A+wOE0c8fK4Mdg3lA/UNQavlKbBSROYCzdV2d3+6x+PJqLK67QIgKVRkNdBc0deXdsSrGSe1qccuwDFfJAFovtyY7W1/oDnBK1rzqABHrIS44V+uqtrGp6fM4FnVoy3ARgkH/qrja+H7q58K39xQ1Qpgq0wFstTx5VaVCV56dUEdNmyREBdkaU5xsc+0+mpNoKjonKoNG0QSIEtLrX5jrmumMQN9flUbYkVioCPN2/jLmIC/3Rhj5WnJH5gnMgc4qJUDvbfvnDhfVz7UqQdqIDFURDaBdVxfDDy5++1D3uDHY4fLgBXimJECrdn6uunxu5elHbnpZcCuMBm2BOioOlTX6XsbOH2zFnBFyYgYHL3PHv7outbzG3BFy5hFbibYM0vGTY9LZZR7zRSZZNqy+B3JidvWLQiXEf8BSrjtcYUwJvwAAAAASUVORK5CYII=',
  name: 'tHOSKY',
  ticker: 'tHOSKY',
  price: '-',
  variation: '-',
  balance: '9998999995',
  fiatBalance: '-',
  sortBy: {
    metadataName: 'tHOSKY',
    fingerprint: 'asset15qks69wv4vk7clnhp4lq7x0rpk6vs0s6exw0ry',
    amount: '9998999995'
  }
};

export const mockPrices: PriceResult = {
  cardano: {
    price: 0.4,
    priceVariationPercentage24h: 1.293
  },
  tokens: new Map()
};

export const userIdServiceMock: Record<keyof UserIdService, jest.Mock> = {
  extendLifespan: jest.fn(),
  makeTemporary: jest.fn(),
  makePersistent: jest.fn(),
  clearId: jest.fn(),
  getRandomizedUserId: jest.fn(),
  getUserId: jest.fn(),
  getAliasProperties: jest.fn(),
  userId$: new Subject() as any,
  isNewSession: jest.fn(() => true),
  resetToDefaultValues: jest.fn(),
  generateWalletBasedUserId: jest.fn()
};

export const postHogClientMocks: Record<keyof typeof PostHogClient.prototype, jest.Mock> = {
  sendEvent: jest.fn(),
  sendPageNavigationEvent: jest.fn(),
  setChain: jest.fn(),
  isFeatureFlagEnabled: jest.fn(),
  sendAliasEvent: jest.fn(),
  subscribeToInitializationProcess: jest.fn(),
  overrideFeatureFlags: jest.fn(),
  getExperimentVariant: jest.fn(),
  subscribeToDistinctIdUpdate: jest.fn(),
  shutdown: jest.fn(),
  sendSessionStartEvent: jest.fn(),
  sendMergeEvent: jest.fn(),
  isFeatureEnabled: jest.fn(),
  featureFlags: jest.fn(),
  featureFlagPayloads: jest.fn(),
  hasOptedInBeta: jest.fn(),
  setOptedInBeta: jest.fn(),
  getFeatureFlagPayload: jest.fn()
};

export const mockAnalyticsTracker: Record<keyof typeof AnalyticsTracker.prototype, jest.Mock> = {
  sendEventToPostHog: jest.fn(),
  setOptedInForEnhancedAnalytics: jest.fn(),
  sendPageNavigationEvent: jest.fn(),
  setChain: jest.fn(),
  sendAliasEvent: jest.fn(),
  sendMergeEvent: jest.fn()
};
