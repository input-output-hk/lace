/* eslint-disable no-magic-numbers */
/* eslint-disable max-len */
import { AssetId } from '@cardano-sdk/util-dev';
import {
  Cardano,
  Reward,
  ChainHistoryProvider,
  RewardsProvider,
  StakePoolProvider,
  UtxoProvider,
  NetworkInfoProvider
} from '@cardano-sdk/core';
import { networkInfoProviderStub } from './NetworkInfoProviderStub';
import { pools } from './StakepoolSearchProviderStub';

export const rewardAccount = Cardano.RewardAccount('stake_test1up7pvfq8zn4quy45r2g572290p9vf99mr9tn7r9xrgy2l2qdsf58d');

export const utxo: Cardano.Utxo[] = [
  [
    {
      address: Cardano.PaymentAddress(
        'addr_test1qq585l3hyxgj3nas2v3xymd23vvartfhceme6gv98aaeg9muzcjqw982pcftgx53fu5527z2cj2tkx2h8ux2vxsg475q2g7k3g'
      ),
      index: 1,
      txId: Cardano.TransactionId('bb217abaca60fc0ca68c1555eca6a96d2478547818ae76ce6836133f3cc546e0')
    },
    {
      address: Cardano.PaymentAddress(
        'addr_test1qzs0umu0s2ammmpw0hea0w2crtcymdjvvlqngpgqy76gpfnuzcjqw982pcftgx53fu5527z2cj2tkx2h8ux2vxsg475qp3y3vz'
      ),
      value: {
        assets: new Map([
          [AssetId.PXL, BigInt(5)],
          [AssetId.TSLA, BigInt(10)]
        ]),
        coins: BigInt(4_027_026_465)
      }
    }
  ],
  [
    {
      address: Cardano.PaymentAddress(
        'addr_test1qzs0umu0s2ammmpw0hea0w2crtcymdjvvlqngpgqy76gpfnuzcjqw982pcftgx53fu5527z2cj2tkx2h8ux2vxsg475qp3y3vz'
      ),
      index: 0,
      txId: Cardano.TransactionId('c7c0973c6bbf1a04a9f306da7814b4fa564db649bf48b0bd93c273bd03143547')
    },
    {
      address: Cardano.PaymentAddress(
        'addr_test1qq585l3hyxgj3nas2v3xymd23vvartfhceme6gv98aaeg9muzcjqw982pcftgx53fu5527z2cj2tkx2h8ux2vxsg475q2g7k3g'
      ),
      value: {
        assets: new Map([[AssetId.TSLA, BigInt(15)]]),
        coins: BigInt(3_289_566)
      }
    }
  ],
  [
    {
      address: Cardano.PaymentAddress(
        'addr_test1qq585l3hyxgj3nas2v3xymd23vvartfhceme6gv98aaeg9muzcjqw982pcftgx53fu5527z2cj2tkx2h8ux2vxsg475q2g7k3g'
      ),
      index: 2,
      txId: Cardano.TransactionId('ea1517b8c36fea3148df9aa1f49bbee66ff59a5092331a67bd8b3c427e1d79d7')
    },
    {
      address: Cardano.PaymentAddress(
        'addr_test1qqydn46r6mhge0kfpqmt36m6q43knzsd9ga32n96m89px3nuzcjqw982pcftgx53fu5527z2cj2tkx2h8ux2vxsg475qypp3m9'
      ),
      value: {
        coins: BigInt(9_825_963)
      }
    }
  ]
];

export const delegate = Cardano.PoolId('pool185g59xpqzt7gf0ljr8v8f3akl95qnmardf2f8auwr3ffx7atjj5');
export const rewards = BigInt(33_333);
export const delegationAndRewards: Cardano.DelegationsAndRewards = { delegate, rewards };

export const ledgerTip = {
  blockNo: 1_111_111,
  hash: '10d64cc11e9b20e15b6c46aa7b1fed11246f437e62225655a30ea47bf8cc22d0',
  slot: 37_834_496
};

export const currentEpoch = {
  end: {
    date: new Date(1_632_687_616)
  },
  number: 158,
  start: {
    date: new Date(1_632_255_616)
  }
};

export const queryTransactionsResult: Cardano.HydratedTx[] = [
  {
    blockHeader: {
      slot: Cardano.Slot(ledgerTip.slot - 100_000)
    },
    body: {
      certificates: [
        {
          __typename: Cardano.CertificateType.StakeKeyRegistration
        },
        {
          __typename: Cardano.CertificateType.StakeDelegation,
          epoch: Cardano.EpochNo(currentEpoch.number - 10)
        }
      ],
      inputs: [
        {
          address: Cardano.PaymentAddress(
            'addr_test1qpfhhfy2qgls50r9u4yh0l7z67xpg0a5rrhkmvzcuqrd0znuzcjqw982pcftgx53fu5527z2cj2tkx2h8ux2vxsg475q9gw0lz'
          ),
          index: 0,
          txId: Cardano.TransactionId('bb217abaca60fc0ca68c1555eca6a96d2478547818ae76ce6836133f3cc546e0')
        }
      ],
      outputs: [
        {
          address: Cardano.PaymentAddress(
            'addr_test1qpfhhfy2qgls50r9u4yh0l7z67xpg0a5rrhkmvzcuqrd0znuzcjqw982pcftgx53fu5527z2cj2tkx2h8ux2vxsg475q9gw0lz'
          ),
          value: { coins: BigInt(5_000_000) }
        },
        {
          address: Cardano.PaymentAddress(
            'addr_test1qplfzem2xsc29wxysf8wkdqrm4s4mmncd40qnjq9sk84l3tuzcjqw982pcftgx53fu5527z2cj2tkx2h8ux2vxsg475q52ukj5'
          ),
          value: { coins: BigInt(5_000_000) }
        },
        {
          address: Cardano.PaymentAddress(
            'addr_test1qqydn46r6mhge0kfpqmt36m6q43knzsd9ga32n96m89px3nuzcjqw982pcftgx53fu5527z2cj2tkx2h8ux2vxsg475qypp3m9'
          ),
          value: { coins: BigInt(9_825_963) }
        }
      ],
      validityInterval: {
        invalidHereafter: Cardano.Slot(ledgerTip.slot + 1)
      }
    }
  } as Cardano.HydratedTx
];
const queryTransactions = () => jest.fn().mockResolvedValue(queryTransactionsResult);

export const protocolParameters = {
  coinsPerUtxoWord: 34_482,
  maxCollateralInputs: 1,
  maxTxSize: 16_384,
  maxValueSize: 1000,
  minFeeCoefficient: 44,
  minFeeConstant: 155_381,
  minPoolCost: 340_000_000,
  poolDeposit: 500_000_000,
  protocolVersion: { major: 5, minor: 0 },
  stakeKeyDeposit: 2_000_000
};

export const rewardsHistory: Reward[] = [
  {
    epoch: Cardano.EpochNo(currentEpoch.number - 3),
    rewards: BigInt(10_000)
  },
  {
    epoch: Cardano.EpochNo(currentEpoch.number - 2),
    rewards: BigInt(11_000)
  }
];

export const genesisParameters = {
  activeSlotsCoefficient: 0.05,
  epochLength: 432_000,
  maxKesEvolutions: 62,
  maxLovelaceSupply: BigInt(45_000_000_000_000_000),
  networkMagic: 764_824_073,
  securityParameter: 2160,
  slotLength: 1,
  slotsPerKesPeriod: 129_600,
  systemStart: new Date(1_506_203_091_000),
  updateQuorum: 5
};

/**
 * Provider stub for testing
 *
 * returns WalletProvider-compatible object
 */
export const mockWalletProvider = (): NetworkInfoProvider &
  ChainHistoryProvider &
  RewardsProvider &
  StakePoolProvider &
  UtxoProvider => ({
  protocolParameters: jest.fn().mockResolvedValue(protocolParameters),
  genesisParameters: jest.fn().mockResolvedValue(genesisParameters),
  ledgerTip: jest.fn().mockResolvedValue(ledgerTip),
  blocksByHashes: jest
    .fn()
    .mockResolvedValue([{ epoch: Cardano.EpochNo(currentEpoch.number - 3) } as Cardano.ExtendedBlockInfo]),
  transactionsByAddresses: queryTransactions(),
  transactionsByHashes: queryTransactions(),
  rewardsHistory: jest.fn().mockResolvedValue(rewardsHistory),
  queryStakePools: async () =>
    Promise.resolve({
      pageResults: pools as Cardano.StakePool[],
      totalResultCount: 5
    }),
  stakePoolStats: async () => ({
    qty: {
      activating: 0,
      active: 1000,
      retired: 500,
      retiring: 5
    }
  }),
  healthCheck: jest.fn().mockResolvedValue({ ok: true }),
  utxoByAddresses: jest.fn().mockResolvedValue(utxo),
  rewardAccountBalance: jest.fn().mockResolvedValue(rewards),
  ...networkInfoProviderStub()
});

export type ProviderStub = ReturnType<typeof mockWalletProvider>;
