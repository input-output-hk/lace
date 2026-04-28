import {
  Cardano,
  Milliseconds,
  ProviderError,
  ProviderFailure,
} from '@cardano-sdk/core';
import { AddressType } from '@cardano-sdk/key-management';
import {
  CardanoPaymentAddress,
  CardanoRewardAccount,
  cardanoProviderDependencyContract,
  cardanoProviderStoreContract,
  FEATURE_FLAG_CARDANO,
} from '@lace-contract/cardano-context';
import { cryptoAddonContract } from '@lace-contract/crypto';
import {
  combineContracts,
  inferModuleContext,
  ModuleName,
} from '@lace-contract/module';
import '@lace-contract/feature';
import { Err, Ok, Timestamp } from '@lace-sdk/util';
import { type Observable, of } from 'rxjs';

import { protocolParameters } from './protocol-parameters';

import type { EraSummary, SubmitTxArgs } from '@cardano-sdk/core';
import type {
  CardanoProvider,
  CardanoProviderContext,
  CardanoProviderDependencies,
} from '@lace-contract/cardano-context';
import type {
  BlockfrostPartialStakePool,
  BlockfrostStakePool,
  BlockfrostStakePoolMetadata,
  CardanoStakePoolsProvider,
  CardanoStakePoolsProviderDependencies,
  StakePoolsNetworkData,
} from '@lace-contract/cardano-stake-pools';
import type { LaceModuleMap } from '@lace-contract/module';
import type { Result } from '@lace-sdk/util';

const toBlockfrostPartialStakePool = (
  details: NonNullable<BlockfrostStakePool>,
  metadata: BlockfrostStakePoolMetadata,
): BlockfrostPartialStakePool => ({ ...details, metadata });

// ANGEL pool data for storybook (healthy pool - no issues)
export const ANGEL_POOL_ID = Cardano.PoolId(
  'pool1wn6a6f23ctq06udwhw27ravdpd6zcr7jlut3yez0wzdackz3222',
);

const angelPoolMetadata: BlockfrostStakePoolMetadata = {
  name: 'ANGEL stake pool',
  ticker: 'ANGEL',
  description: 'ANGEL pool at pre-production',
};

const angelPoolDetails: BlockfrostStakePool = {
  pool_id: ANGEL_POOL_ID,
  hex: '74f5dd2551c2c0fd71aebb95e1f58d0b742c0fd2ff1712644f709bdc',
  active_stake: '36479045164057',
  blocks_minted: 341_667,
  declared_pledge: '220000000000',
  fixed_cost: '170000000',
  live_delegators: 718,
  live_pledge: '573260837660',
  live_saturation: 0.556_545,
  live_stake: '35323381848420',
  margin_cost: 0.006_9,
  owners: ['stake_test1up7pvfq8zn4quy45r2g572290p9vf99mr9tn7r9xrgy2l2qdsf58d'],
};

// High saturation pool (saturation >= 99%)
export const HIGH_SATURATION_POOL_ID = Cardano.PoolId(
  'pool129n0d9zrla7ntfjlwhqrtmn7halem0shcjd5mz5zhfym2auyu05',
);

const highSaturationPoolMetadata: BlockfrostStakePoolMetadata = {
  name: 'Saturated Pool',
  ticker: 'SATUR',
  description: 'A pool with very high saturation',
};

const highSaturationPoolDetails: BlockfrostStakePool = {
  pool_id: HIGH_SATURATION_POOL_ID,
  hex: '5166cd28a1ffd74b527de707c5247b1e1b6df6ea5cd0a5a0dcb926ea',
  active_stake: '68000000000000',
  blocks_minted: 50_000,
  declared_pledge: '100000000000',
  fixed_cost: '340000000',
  live_delegators: 2500,
  live_pledge: '150000000000',
  live_saturation: 0.995,
  live_stake: '67500000000000',
  margin_cost: 0.01,
  owners: [],
};

// CAN1 pool (CanadaStakes - healthy pool for browse pool tests)
export const CAN1_POOL_ID = Cardano.PoolId(
  'pool1vvkurfxhajtj4f7x8wjkeet7rg8amz34duy5nux76per5sn3npx',
);

const can1PoolMetadata: BlockfrostStakePoolMetadata = {
  name: 'CanadaStakes',
  ticker: 'CAN1',
  description:
    'To advance the cardano community in canada through assistance, knowledge, interactive events and support for local charities.',
};

const can1PoolDetails: BlockfrostStakePool = {
  pool_id: CAN1_POOL_ID,
  hex: '632dc1a4d7ec972aa7c63ba56ce57e1a0fdd8a356f0949f0ded0723a',
  active_stake: '4174806142199',
  blocks_minted: 29_056,
  declared_pledge: '5000000000',
  fixed_cost: '2500000000',
  live_delegators: 500,
  live_pledge: '6000000000',
  live_saturation: 0.066,
  live_stake: '4188526469250',
  margin_cost: 0.05,
  owners: [],
};

// Pledge not met pool (livePledge < pledge)
export const PLEDGE_NOT_MET_POOL_ID = Cardano.PoolId(
  'pool1p9ldx03yshlzj4dlhlaxd59nukysjd3mldc8cuv5ae897q7ky2z',
);

const pledgeNotMetPoolMetadata: BlockfrostStakePoolMetadata = {
  name: 'Under-Pledged Pool',
  ticker: 'UNPLD',
  description: 'A pool that has not met its pledge',
};

const pledgeNotMetPoolDetails: BlockfrostStakePool = {
  pool_id: PLEDGE_NOT_MET_POOL_ID,
  hex: '097ed33e2485fe2955bfbffa66d0b3e58909363bfb707c7194ee4e5f',
  active_stake: '20000000000000',
  blocks_minted: 15_000,
  declared_pledge: '500000000000',
  fixed_cost: '340000000',
  live_delegators: 300,
  live_pledge: '100000000000',
  live_saturation: 0.3,
  live_stake: '19500000000000',
  margin_cost: 0.015,
  owners: [],
};

// Retiring pool (represented in network data + fixture id for stories)
export const RETIRING_POOL_ID = Cardano.PoolId(
  'pool1pu5jlj4q9w9jlxeu370a3c9myx47md5j5m2str0naunn2q3lkdy',
);

const retiringPoolMetadata: BlockfrostStakePoolMetadata = {
  name: 'Retiring Pool',
  ticker: 'RETIR',
  description: 'A pool that is retiring soon',
};

const retiringPoolDetails: BlockfrostStakePool = {
  pool_id: RETIRING_POOL_ID,
  hex: '0f292fcaa02b8b2f9b3c8f3c8f3c8f3c8f3c8f3c8f3c8f3c8f3c8f3c',
  active_stake: '30000000000000',
  blocks_minted: 25_000,
  declared_pledge: '100000000000',
  fixed_cost: '340000000',
  live_delegators: 450,
  live_pledge: '120000000000',
  live_saturation: 0.45,
  live_stake: '29000000000000',
  margin_cost: 0.01,
  owners: [],
};

// Pool used by ActivityDetailsRewards story (activities data reward activity)
const REWARD_ACTIVITY_POOL_ID = Cardano.PoolId(
  'pool1h8yl5mkyrfmfls2x9fu9mls3ry6egnw4q6efg34xr37zc243gkf',
);

const rewardActivityPoolMetadata: BlockfrostStakePoolMetadata = {
  name: 'Reward Activity Pool',
  ticker: 'REWD',
  description: 'Pool for ActivityDetailsRewards story',
};

const rewardActivityPoolDetails: BlockfrostStakePool = {
  pool_id: REWARD_ACTIVITY_POOL_ID,
  hex: '8f0d9e8c7b6a59483726150493827160f0e0d0c0b0a090807060504030201',
  active_stake: '10000000000000',
  blocks_minted: 10_000,
  declared_pledge: '100000000000',
  fixed_cost: '340000000',
  live_delegators: 100,
  live_pledge: '120000000000',
  live_saturation: 0.1,
  live_stake: '9500000000000',
  margin_cost: 0.01,
  owners: [],
};

type PoolFixture = {
  details: NonNullable<BlockfrostStakePool>;
  metadata: BlockfrostStakePoolMetadata;
};

const POOL_FIXTURES: Record<Cardano.PoolId, PoolFixture> = {
  [ANGEL_POOL_ID]: {
    details: angelPoolDetails,
    metadata: angelPoolMetadata,
  },
  [CAN1_POOL_ID]: {
    details: can1PoolDetails,
    metadata: can1PoolMetadata,
  },
  [HIGH_SATURATION_POOL_ID]: {
    details: highSaturationPoolDetails,
    metadata: highSaturationPoolMetadata,
  },
  [PLEDGE_NOT_MET_POOL_ID]: {
    details: pledgeNotMetPoolDetails,
    metadata: pledgeNotMetPoolMetadata,
  },
  [RETIRING_POOL_ID]: {
    details: retiringPoolDetails,
    metadata: retiringPoolMetadata,
  },
  [REWARD_ACTIVITY_POOL_ID]: {
    details: rewardActivityPoolDetails,
    metadata: rewardActivityPoolMetadata,
  },
};

/** Exported for integration tests / Storybook setup (pre-seed `cardanoStakePools` slice). */
export const stubStakePoolsNetworkData: StakePoolsNetworkData = {
  activeSlotsCoefficient: 0.05,
  desiredNumberOfPools: 500,
  epochLength: 432_000,
  liveStake: 536_391_538_979_323,
  maxLovelaceSupply: 45_000_000_000_000_000,
  monetaryExpansion: 0.003,
  poolInfluence: 0.3,
  reserves: 13_417_308_246_875_150,
  retiringPools: [RETIRING_POOL_ID],
  slotLength: 1,
  timestamp: 0,
};

const stubCardanoStakePoolsProvider: CardanoStakePoolsProvider = {
  getMetadata: (poolId: Cardano.PoolId) =>
    of(Ok(POOL_FIXTURES[poolId]?.metadata ?? null)),
  getNetworkData: () => of(Ok(stubStakePoolsNetworkData)),
  getStakePool: (poolId: Cardano.PoolId) =>
    of(Ok(POOL_FIXTURES[poolId]?.details ?? null)),
  getStakePools: () => {
    const partials = Object.values(POOL_FIXTURES).map(({ details, metadata }) =>
      toBlockfrostPartialStakePool(details, metadata),
    );
    return of(Ok(partials));
  },
};

// Simple mock implementations that avoid complex type issues
export const stubCardanoProvider: CardanoProvider = {
  getTip: (_context: CardanoProviderContext) => {
    const mockTip: Cardano.Tip = {
      blockNo: Cardano.BlockNo(1_000_000),
      hash: Cardano.BlockId(
        '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
      ),
      slot: Cardano.Slot(50_000_000),
    };
    return of(Ok(mockTip));
  },

  getProtocolParameters: (_context: CardanoProviderContext) => {
    return of(Ok(protocolParameters));
  },

  discoverAddresses: (_props, context: CardanoProviderContext) => {
    // Return mock addresses for storybook
    const mockAddress = {
      address: CardanoPaymentAddress(
        'addr_test1qzuk9c0qaq8ustvatan8xelmp3wjn9n99c78004dsfjwvs4h5kpytryyph0d9vyzj9g9e5rwsnxc2djcandyywdvu8kq54t0f8',
      ),
      name: 'Mock Address',
      data: {
        accountIndex: 0,
        index: 0,
        networkId: context.chainId.networkId,
        networkMagic: context.chainId.networkMagic,
        type: AddressType.External,
        rewardAccount: CardanoRewardAccount(
          'stake_test1up7pvfq8zn4quy45r2g572290p9vf99mr9tn7r9xrgy2l2qdsf58d',
        ),
      },
    };
    return of(Ok(mockAddress));
  },

  getTokenMetadata: (
    { tokenId: _tokenId },
    _context: CardanoProviderContext,
  ) => {
    return of(
      Ok({
        blockchainSpecific: {
          updatedAt: Timestamp(new Date().getTime()),
        },
        decimals: 6,
      }),
    );
  },

  getTokens: (_props, _context: CardanoProviderContext) => {
    return of(Ok([]));
  },

  getAddressTransactionHistory: (_props, _context: CardanoProviderContext) => {
    return of(Ok([]));
  },

  getTransactionDetails: (
    _txId: Cardano.TransactionId,
    _context: CardanoProviderContext,
  ) => {
    return of(
      Err(
        new ProviderError(
          ProviderFailure.NotFound,
          undefined,
          'Stub implementation',
        ),
      ),
    );
  },

  getAccountRewards: (_props, _context: CardanoProviderContext) => {
    return of(Ok([]));
  },

  getEraSummaries: (_context: CardanoProviderContext) => {
    const eraSummary: EraSummary = {
      start: { slot: 0, time: new Date('2020-01-01') },
      parameters: { epochLength: 432_000, slotLength: Milliseconds(1000) },
    };
    return of(Ok([eraSummary]));
  },

  resolveInput: (_txIn: Cardano.TxIn, _context: CardanoProviderContext) => {
    return of(Ok(null));
  },

  getAccountUtxos: (): Observable<Result<Cardano.Utxo[], ProviderError>> =>
    of(Ok([])),

  getTotalAccountTransactionCount: (): Observable<
    Result<number, ProviderError>
  > => of(Ok(10)),

  getRewardAccountInfo: (_props, _context: CardanoProviderContext) => {
    // Return stub reward account info - indicates no staking (loading state)
    return of(
      Err(
        new ProviderError(
          ProviderFailure.NotFound,
          undefined,
          'Stub implementation - no reward account info',
        ),
      ),
    );
  },

  submitTx: (_props: SubmitTxArgs, _context: CardanoProviderContext) =>
    of(
      Ok(
        Cardano.TransactionId(
          '295d5e0f7ee182426eaeda8c9f1c63502c72cdf4afd6e0ee0f209adf94a614e7',
        ),
      ),
    ),

  getAccountDelegations: (_props, _context: CardanoProviderContext) => {
    return of(Ok([]));
  },

  getAccountRegistrations: (_props, _context: CardanoProviderContext) => {
    return of(Ok([]));
  },

  getAccountWithdrawals: (_props, _context: CardanoProviderContext) => {
    return of(Ok([]));
  },
};

// Stub store
const store = {
  context: {
    actions: {},
    selectors: {},
  },
  load: async () => ({
    default: async () => ({
      sideEffectDependencies: {
        cardanoProvider: stubCardanoProvider,
        cardanoStakePoolsProvider: stubCardanoStakePoolsProvider,
      } as CardanoProviderDependencies & CardanoStakePoolsProviderDependencies,
    }),
  }),
};

// Create the stub module
const sharedModule = inferModuleContext({
  moduleName: ModuleName('cardano-provider-blockfrost'),
  dependsOn: combineContracts([cryptoAddonContract] as const),
  implements: combineContracts([
    cardanoProviderStoreContract,
    cardanoProviderDependencyContract,
  ] as const),
  store,
  feature: {
    willLoad: featureFlags =>
      featureFlags.some(flag => flag.key === FEATURE_FLAG_CARDANO),
    metadata: {
      name: 'Blockfrost (Stub)',
      description: 'Stub Blockfrost provider for Storybook',
    },
  },
  addons: {},
});

const moduleMap: LaceModuleMap = {
  'lace-mobile': sharedModule,
};

export const stubBlockfrostProviderModule = moduleMap;
