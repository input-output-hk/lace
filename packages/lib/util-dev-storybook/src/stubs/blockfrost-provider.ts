import {
  Cardano,
  Milliseconds,
  ProviderError,
  ProviderFailure,
} from '@cardano-sdk/core';
import { Hash28ByteBase16 } from '@cardano-sdk/crypto';
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
import { Err, Ok, Timestamp } from '@lace-lib/util';
import { type Observable, of } from 'rxjs';

import { protocolParameters } from './protocol-parameters';

import type { EraSummary, SubmitTxArgs } from '@cardano-sdk/core';
import type {
  CardanoProvider,
  CardanoProviderContext,
  CardanoProviderDependencies,
  DRepSummary,
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
import type { Result } from '@lace-lib/util';

const toBlockfrostPartialStakePool = (
  details: NonNullable<BlockfrostStakePool>,
  metadata: BlockfrostStakePoolMetadata,
): BlockfrostPartialStakePool => ({ ...details, metadata });

const STUB_DISCOVERED_PAYMENT_ADDRESS_STRING =
  'addr_test1qzuk9c0qaq8ustvatan8xelmp3wjn9n99c78004dsfjwvs4h5kpytryyph0d9vyzj9g9e5rwsnxc2djcandyywdvu8kq54t0f8';
const STUB_DISCOVERED_PAYMENT_ADDRESS = CardanoPaymentAddress(
  STUB_DISCOVERED_PAYMENT_ADDRESS_STRING,
);
const STUB_DISCOVERED_REWARD_ACCOUNT = CardanoRewardAccount(
  'stake_test1up7pvfq8zn4quy45r2g572290p9vf99mr9tn7r9xrgy2l2qdsf58d',
);

/**
 * Lovelace balance produced by `getAccountUtxos` for storybook stories. Must
 * match the lovelace `available` in `currentTokens` (apps/lace-mobile-storybook
 * fixture) so trackAccountTokens recomputes the same balance after the natural
 * UTxO refetch trigger fires (activities + addresses present), avoiding clobber
 * of the tokens seeded via `setAddressTokens`.
 */
export const STUB_ACCOUNT_LOVELACE_BALANCE = 125_456_780_000_000_000n;

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

const toCip105DrepId = (hex: string, hasScript: boolean): Cardano.DRepID => {
  try {
    return Cardano.DRepID.cip105FromCredential({
      hash: Hash28ByteBase16(hex),
      type: hasScript
        ? Cardano.CredentialType.ScriptHash
        : Cardano.CredentialType.KeyHash,
    });
  } catch {
    return Cardano.DRepID(
      `drep1${hex.replace(/[^a-f0-9]/g, '0').slice(0, 39)}`,
    );
  }
};

type DRepStub = Omit<DRepSummary, 'cip105DrepId'>;

const rawStubDReps: DRepStub[] = [
  {
    drepId: Cardano.DRepID(
      'drep1y2j8g8wuy77t752e8tzgyzu64wexjnqytalu27ew3dhtxmgchssuz',
    ),
    hex: 'a4741ddc27bcbf51593ac4820b9aabb2694c045f7fc57b2e8b6eb36d',
    isActive: true,
    retired: false,
    expired: false,
    amount: '15000000000',
    hasScript: false,
    name: 'Cardano Foundation DRep',
    metadata: {
      imageUrl:
        'https://ipfs.io/ipfs/QmQuACDqwUDnimsBWudnSiiKNKKgRfUUYjU2XDiE21rLYd',
      bio: 'Stewarding Cardano governance on behalf of the community.',
      email: 'governance@example.org',
      objectives: 'Keep the treasury safe from unnecessary spending.',
      motivations: 'Transparency and accountability.',
      qualifications: 'Operating Cardano infrastructure since 2021.',
      paymentAddress:
        'addr1q8gugy4wtkxzxh4l0ea36dml2refn6muwfetafwurmucuf7w3ljnue344ndssp4nfux2r5wkm2nx53t0ha7mn92e94xqx4fq4c',
      references: [{ label: 'website', uri: 'https://example.org' }],
    },
  },
  {
    drepId: Cardano.DRepID(
      'drep1y2c7se8qeuzy33luc9x08l96fulqscksdjkrh3mmuggyn0q6rr4zx',
    ),
    hex: 'b1e864e0cf0448c7fcc14cf3fcba4f3e0862d06cac3bc77be21049bc',
    isActive: true,
    retired: false,
    expired: false,
    amount: '8500000000',
    hasScript: false,
    name: 'IOG DRep Delegate',
  },
  {
    drepId: Cardano.DRepID(
      'drep1ytp0jshwta2qhpr7fv3q9maeax77ng0favy8qzafu26tayqcxjgaf',
    ),
    hex: 'c2f942ee5f540b847e4b2202efb9e9bde9a1e9eb08700ba9e2b4be90',
    isActive: false,
    retired: false,
    expired: true,
    amount: '3200000000',
    hasScript: false,
    name: 'Community DRep Alpha',
  },
  {
    drepId: Cardano.DRepID(
      'drep1ytf6q50lda63e7fltjjrryd2az7w0vh6h65wpw4f70za7qgl9lfc6',
    ),
    hex: 'd3a051ff6f751cf93f5ca43191aae8bce7b2fabea8e0baa9f3c5df01',
    isActive: true,
    retired: false,
    expired: false,
    amount: '22000000000',
    hasScript: false,
    name: 'Emurgo Governance',
  },
  {
    drepId: Cardano.DRepID(
      'drep1y0jtzv5gwzdrm7mlqnchhgd7p2w0s0qmcn00r262pl2wqysgn0zfv',
    ),
    hex: 'e4b13288709a3dfb7f04f17ba1be0a9cf83c1bc4def1ab4a0fd4e012',
    isActive: true,
    retired: false,
    expired: false,
    amount: '11750000000',
    hasScript: true,
    name: 'Script-Governed DRep',
  },
  {
    drepId: Cardano.DRepID(
      'drep1yt6uysuesy95auyqw4gt583v7jdp60fwkhcgut93krjlzgc769vl9',
    ),
    hex: 'f5c24399810b4ef0807550ba1e2cf49a1d3d2eb5f08e2cb1b0e5f123',
    isActive: true,
    retired: false,
    expired: false,
    amount: '5600000000',
    hasScript: false,
    name: 'DeFi Cardano DRep',
  },
  {
    drepId: Cardano.DRepID(
      'drep1y2ndx4qqjckgkj53qd3r6t5yux355nldq6hsua7vk8mfydqt443rm',
    ),
    hex: 'a6d35400962c8b4a9103623d2e84e1a34a4fed06af0e77ccb1f69234',
    isActive: true,
    retired: false,
    expired: false,
    amount: '19400000000',
    hasScript: false,
    name: 'Cardano Whale DRep',
  },
  {
    drepId: Cardano.DRepID(
      'drep1y2m7geg3qul96jcsyaeq8hlw9whp5z42zlylpzyf6tn6x3gq5ntf9',
    ),
    hex: 'b7e46511073e5d4b10277203dfee2bae1a0aaa17c9f08889d2e7a345',
    isActive: false,
    retired: false,
    expired: true,
    amount: '900000000',
    hasScript: false,
  },
  {
    drepId: Cardano.DRepID(
      'drep1yty02a3zrp8ku4crz2zrurll8je0yygm9rdqzzvcu0utg4scy7zvz',
    ),
    hex: 'c8f57622184f6e570312843e0fff3cb2f2111b28da010998e3f8b456',
    isActive: true,
    retired: false,
    expired: false,
    amount: '7300000000',
    hasScript: false,
    name: 'NFT Community DRep',
  },
  {
    drepId: Cardano.DRepID(
      'drep1ytvsdpen99g876q5zw257yqq3hpsxq3ze843yz4fgqx92ecwpdevu',
    ),
    hex: 'd906873329507f681413954f10008dc3030222c9eb120aa9400c5567',
    isActive: true,
    retired: false,
    expired: false,
    amount: '33000000000',
    hasScript: false,
    name: 'Stake Pool Operator DRep',
  },
  {
    drepId: Cardano.DRepID(
      'drep1yt4p0xzyxpsgq7f9ysr9qgg3nm2pgyenmterrwaqt5wkv7qng2nrd',
    ),
    hex: 'ea179844306080792524065021119ed4141333daf231bba05d1d6678',
    isActive: true,
    retired: false,
    expired: false,
    amount: '2100000000',
    hasScript: false,
    name: 'Catalyst Voter DRep',
  },
  {
    drepId: Cardano.DRepID(
      'drep1ytaj3224g9cfpqpkx5tkqv3rpljj2fzyavp59n93dch80zga5crgz',
    ),
    hex: 'fb28a955417090803635176032230fe5252444eb0342ccb16e2e7789',
    isActive: false,
    retired: false,
    expired: true,
    amount: '450000000',
    hasScript: false,
    name: 'Educational DRep',
  },
];

const stubDReps: DRepSummary[] = rawStubDReps.map(d => ({
  ...d,
  cip105DrepId: toCip105DrepId(d.hex, d.hasScript),
}));

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
      address: STUB_DISCOVERED_PAYMENT_ADDRESS,
      name: 'Mock Address',
      data: {
        accountIndex: 0,
        index: 0,
        networkId: context.chainId.networkId,
        networkMagic: context.chainId.networkMagic,
        type: AddressType.External,
        rewardAccount: STUB_DISCOVERED_REWARD_ACCOUNT,
      },
    };
    return of(Ok(mockAddress));
  },

  getTokenMetadata: ({ tokenId }, _context: CardanoProviderContext) => {
    // The base token (lovelace) has an intrinsic name/ticker. Returning
    // name/ticker-less metadata here clobbers the seeded base-token metadata
    // to an unnamed token whenever a metadata load runs for it (e.g. after a
    // UTxO-driven token refresh), making it render as the raw `lovelace` id.
    // Return realistic base-token metadata (always ticker ADA, regardless
    // of network) so it keeps a name/ticker.
    if (tokenId === 'lovelace') {
      return of(
        Ok({
          name: 'Cardano',
          ticker: 'ADA',
          decimals: 6,
          blockchainSpecific: {
            updatedAt: Timestamp(new Date().getTime()),
          },
        }),
      );
    }
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
    of(
      Ok([
        [
          {
            txId: Cardano.TransactionId(
              'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
            ),
            index: 0,
            address: Cardano.PaymentAddress(
              STUB_DISCOVERED_PAYMENT_ADDRESS_STRING,
            ),
          },
          {
            address: Cardano.PaymentAddress(
              STUB_DISCOVERED_PAYMENT_ADDRESS_STRING,
            ),
            value: { coins: STUB_ACCOUNT_LOVELACE_BALANCE },
          },
        ] as Cardano.Utxo,
      ]),
    ),

  getUtxosAtAddress: (): Observable<Result<Cardano.Utxo[], ProviderError>> =>
    of(Ok([])),

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

  getDReps: (_context: CardanoProviderContext) => {
    return of(Ok(stubDReps));
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
