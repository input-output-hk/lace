/* eslint-disable no-magic-numbers, sonarjs/no-duplicate-string, new-cap  */
import { createStubStakePoolProvider } from '@cardano-sdk/util-dev';
import { Cardano, StakePoolProvider, StakePoolStats } from '@cardano-sdk/core';
import { StakePoolSearchResults } from '@src/wallet/types';
import { Percent } from '@cardano-sdk/util';

type Details = 'metrics' | 'relays' | 'owners' | 'margin' | 'cost' | 'vrf' | 'rewardAccount';
type PoolDetails = Pick<Cardano.StakePool, Details>;

export const pools: Partial<Cardano.StakePool>[] = [
  {
    id: Cardano.PoolId('pool126zlx7728y7xs08s8epg9qp393kyafy9rzr89g4qkvv4cv93zem'),
    hexId: Cardano.PoolIdHex('b76e3a1104a9d816a67d5826a155c9e2979a839d0d944346d47e33ab'),
    pledge: BigInt('3000000000'),
    status: Cardano.StakePoolStatus.Retired,
    cost: BigInt('100000000'),
    metrics: {
      blocksCreated: 3.1,
      delegators: 11,
      livePledge: BigInt('2000000000'),
      saturation: Percent(0.211),
      size: undefined,
      stake: undefined,
      ros: Percent(0.69),
      lastRos: Percent(0.88)
    },
    margin: {
      numerator: 2.01,
      denominator: 50
    },
    metadata: {
      name: 'NEDSCAVE.IO',
      ticker: 'NEDS1',
      description: 'This is the NEDS1 description',
      homepage: 'http://www.visn.com',
      ext: {
        serial: 1,
        pool: {
          id: Cardano.PoolIdHex('b76e3a1104a9d816a67d5826a155c9e2979a839d0d944346d47e33ab')
        }
      }
    }
  },
  {
    id: Cardano.PoolId('pool156gxlrk0e3phxadasa33yzk9e94wg7tv3au02jge8eanv9zc4ym'),
    hexId: Cardano.PoolIdHex('c76e3a1104a9d816a67d5826a155c9e2979a839d0d944346d47e33ab'),
    pledge: BigInt('5000000000'),
    cost: BigInt('89000000'),
    margin: {
      numerator: 2.21,
      denominator: 50
    },
    status: Cardano.StakePoolStatus.Active,
    metrics: {
      blocksCreated: 3.273,
      delegators: 28,
      livePledge: BigInt('2000000000'),
      saturation: Percent(0.7014),
      size: undefined,
      stake: {
        live: BigInt('201000000'),
        active: BigInt('201000000')
      },
      ros: Percent(0.69),
      lastRos: Percent(0.88)
    },
    metadata: {
      name: 'THE AMSTERDAM NODE',
      ticker: 'AMS',
      description: 'This is the AMS description',
      homepage: 'https://nordicpool.org',
      ext: {
        serial: 1,
        pool: {
          id: Cardano.PoolIdHex('c76e3a1104a9d816a67d5826a155c9e2979a839d0d944346d47e33ab')
        }
      }
    }
  },
  {
    id: Cardano.PoolId('pool1tmn4jxlnp64y7hwwwz62vahtqt2maqqj6xy0qnlrhmlmq3u8q0e'),
    hexId: Cardano.PoolIdHex('d76e3a1104a9d816a67d5826a155c9e2979a839d0d944346d47e33ab'),
    pledge: BigInt('1000000000'),
    status: Cardano.StakePoolStatus.Retired,
    cost: BigInt('100000000'),
    margin: {
      numerator: 2.21,
      denominator: 50
    },
    metrics: {
      blocksCreated: 3.333,
      delegators: 8,
      livePledge: BigInt('2000000000'),
      saturation: Percent(0.991),
      size: undefined,
      stake: {
        live: BigInt('77000000'),
        active: BigInt('77000000')
      },
      ros: Percent(0.69),
      lastRos: Percent(0.88)
    }
  },
  {
    id: Cardano.PoolId('pool1jcwn98a6rqr7a7yakanm5sz6asx9gfjsr343mus0tsye23wmg70'),
    hexId: Cardano.PoolIdHex('e76e3a1104a9d816a67d5826a155c9e2979a839d0d944346d47e33ab'),
    pledge: BigInt('7000000000'),
    status: Cardano.StakePoolStatus.Active,
    cost: BigInt('55000000'),
    margin: {
      numerator: 1.21,
      denominator: 50
    },
    metrics: {
      blocksCreated: 2.355,
      delegators: 16,
      livePledge: BigInt('2000000000'),
      saturation: Percent(1.196),
      size: undefined,
      stake: {
        live: BigInt('34000000'),
        active: BigInt('34000000')
      },
      ros: Percent(0.69),
      lastRos: Percent(0.88)
    },
    metadata: {
      name: 'stakit.io Pool by TOBG',
      ticker: 'STI',
      description: 'This is the STI description',
      homepage: 'https://nordicpool.org',
      ext: {
        serial: 1,
        pool: {
          id: Cardano.PoolIdHex('e76e3a1104a9d816a67d5826a155c9e2979a839d0d944346d47e33ab')
        }
      }
    }
  },
  {
    id: Cardano.PoolId('pool1euf2nh92ehqfw7rpd4s9qgq34z8dg4pvfqhjmhggmzk95gcd402'),
    hexId: Cardano.PoolIdHex('cf12a9dcaacdc09778616d60502011a88ed4542c482f2ddd08d8ac5a'),
    pledge: BigInt('500000000'),
    status: Cardano.StakePoolStatus.Retiring,
    cost: BigInt('77000000'),
    metrics: {
      blocksCreated: 1.802,
      delegators: 2,
      livePledge: BigInt('2000000000'),
      saturation: Percent(1.001),
      size: undefined,
      stake: {
        live: BigInt('53000000'),
        active: BigInt('53000000')
      },
      ros: Percent(0.69),
      lastRos: Percent(0.88)
    },
    margin: {
      numerator: 0.79,
      denominator: 50
    },
    metadata: {
      name: '#2 Nordic Pool',
      description: '#2 Nordic Pool. Easy ADA staking. Sit back, relax, and delegate.',
      ticker: 'NORTH',
      homepage: 'https://nordicpool.org'
    }
  },
  {
    id: Cardano.PoolId('pool1fghrkl620rl3g54ezv56weeuwlyce2tdannm2hphs62syf3vyyh'),
    hexId: Cardano.PoolIdHex('4a2e3b7f4a78ff1452b91329a7673c77c98ca96dece7b55c37869502'),
    pledge: BigInt('1500000000'),
    cost: BigInt('99000000'),
    status: Cardano.StakePoolStatus.Retiring,
    metrics: {
      blocksCreated: 3.016,
      delegators: 22,
      livePledge: BigInt('2000000000'),
      saturation: Percent(0.8077),
      size: undefined,
      stake: {
        live: BigInt('53000000'),
        active: BigInt('53000000')
      },
      ros: Percent(0.69),
      lastRos: Percent(0.88)
    },
    metadata: {
      name: 'VEGASPool',
      description: 'Easy ADA staking. Sit back, relax, and delegate.',
      ticker: 'VEGA2',
      homepage: 'https://nordicpool.org'
    }
  }
] as unknown as Partial<Cardano.StakePool>[];

const detailsForAll: PoolDetails = {
  cost: BigInt('304000000'),
  margin: {
    numerator: 1,
    denominator: 50
  },
  owners: [
    Cardano.RewardAccount('stake_test1uqrw9tjymlm8wrwq7jk68n6v7fs9qz8z0tkdkve26dylmfc2ux2hj'),
    Cardano.RewardAccount('stake_test1uq7g7kqeucnqfweqzgxk3dw34e8zg4swnc7nagysug2mm4cm77jrx')
  ],
  metrics: {
    blocksCreated: 4.02,
    delegators: 13,
    livePledge: BigInt('2000000000'),
    saturation: Percent(0.021),
    size: undefined,
    stake: {
      live: BigInt('34000000'),
      active: BigInt('34000000')
    },
    ros: Percent(0.69),
    lastRos: Percent(0.88)
  },
  relays: undefined,
  rewardAccount: Cardano.RewardAccount('stake_test1uqrw9tjymlm8wrwq7jk68n6v7fs9qz8z0tkdkve26dylmfc2ux2hj'),
  vrf: undefined
} as unknown as PoolDetails;

export const mockedStakePools: Cardano.StakePool[] = pools.map(
  (pool) =>
    ({
      ...detailsForAll,
      ...pool
    } as Cardano.StakePool)
);

export const mockedStakePoolSearchResults: Promise<StakePoolSearchResults> = Promise.resolve({
  pageResults: mockedStakePools,
  totalResultCount: mockedStakePools.length
});

export const mockedStakePoolStats: Promise<StakePoolStats> = Promise.resolve({
  qty: {
    activating: 0,
    active: mockedStakePools.filter((pool) => pool.status === Cardano.StakePoolStatus.Active).length,
    retired: mockedStakePools.filter((pool) => pool.status === Cardano.StakePoolStatus.Retired).length,
    retiring: mockedStakePools.filter((pool) => pool.status === Cardano.StakePoolStatus.Retiring).length
  }
});

export const stakepoolSearchProviderStub = (stakePools: Cardano.StakePool[] = mockedStakePools): StakePoolProvider =>
  createStubStakePoolProvider(stakePools);
