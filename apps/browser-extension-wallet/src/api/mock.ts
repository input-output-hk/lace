/* eslint-disable no-magic-numbers, new-cap */
import { Percent } from '@cardano-sdk/util';
import { Wallet } from '@lace/cardano';

type Details = 'metrics' | 'relays' | 'owners' | 'margin' | 'cost' | 'vrf' | 'rewardAccount';
type PoolDetails = Pick<Wallet.Cardano.StakePool, Details>;

const pools: Omit<Wallet.Cardano.StakePool, Details>[] = [
  {
    id: Wallet.Cardano.PoolId('pool1syqhydhdzcuqhwtt6q4m63f9g8e7262wzsvk7e0r0njsyjyd0yn'),
    hexId: Wallet.Cardano.PoolIdHex('a76e3a1104a9d816a67d5826a155c9e2979a839d0d944346d47e33ab'),
    pledge: BigInt('2000000000'),
    status: Wallet.Cardano.StakePoolStatus.Active,
    metadata: {
      name: 'StakedTestPool',
      ticker: 'STTST',
      description: 'This is the STTST description',
      homepage: 'http://www.sttst.com',
      ext: {
        serial: 1,
        pool: {
          id: Wallet.Cardano.PoolIdHex('a76e3a1104a9d816a67d5826a155c9e2979a839d0d944346d47e33ab')
        }
      }
    }
  },
  {
    id: Wallet.Cardano.PoolId('pool126zlx7728y7xs08s8epg9qp393kyafy9rzr89g4qkvv4cv93zem'),
    hexId: Wallet.Cardano.PoolIdHex('b76e3a1104a9d816a67d5826a155c9e2979a839d0d944346d47e33ab'),
    pledge: BigInt('3000000000'),
    status: Wallet.Cardano.StakePoolStatus.Retired,
    metadata: {
      name: 'vision',
      ticker: 'visn',
      description: 'This is the visn description',
      homepage: 'http://www.visn.com',
      ext: {
        serial: 1,
        pool: {
          id: Wallet.Cardano.PoolIdHex('b76e3a1104a9d816a67d5826a155c9e2979a839d0d944346d47e33ab')
        }
      }
    }
  },
  {
    id: Wallet.Cardano.PoolId('pool156gxlrk0e3phxadasa33yzk9e94wg7tv3au02jge8eanv9zc4ym'),
    hexId: Wallet.Cardano.PoolIdHex('c76e3a1104a9d816a67d5826a155c9e2979a839d0d944346d47e33ab'),
    pledge: BigInt('5000000000'),
    status: Wallet.Cardano.StakePoolStatus.Active,
    metadata: {
      name: 'THE AMSTERDAM NODE',
      ticker: 'AMS',
      description: 'This is the AMS description',
      homepage: 'http://www.ams.com',
      ext: {
        serial: 1,
        pool: {
          id: Wallet.Cardano.PoolIdHex('c76e3a1104a9d816a67d5826a155c9e2979a839d0d944346d47e33ab')
        }
      }
    }
  },
  {
    id: Wallet.Cardano.PoolId('pool1tmn4jxlnp64y7hwwwz62vahtqt2maqqj6xy0qnlrhmlmq3u8q0e'),
    hexId: Wallet.Cardano.PoolIdHex('d76e3a1104a9d816a67d5826a155c9e2979a839d0d944346d47e33ab'),
    pledge: BigInt('1000000000'),
    status: Wallet.Cardano.StakePoolStatus.Retired
  },
  {
    id: Wallet.Cardano.PoolId('pool1jcwn98a6rqr7a7yakanm5sz6asx9gfjsr343mus0tsye23wmg70'),
    hexId: Wallet.Cardano.PoolIdHex('e76e3a1104a9d816a67d5826a155c9e2979a839d0d944346d47e33ab'),
    pledge: BigInt('7000000000'),
    status: Wallet.Cardano.StakePoolStatus.Active,
    metadata: {
      name: 'TestPool',
      ticker: 'TEST',
      description: 'This is the TEST description',
      homepage: 'http://www.test.com',
      ext: {
        serial: 1,
        pool: {
          id: Wallet.Cardano.PoolIdHex('e76e3a1104a9d816a67d5826a155c9e2979a839d0d944346d47e33ab')
        }
      }
    }
  },
  {
    id: Wallet.Cardano.PoolId('pool1euf2nh92ehqfw7rpd4s9qgq34z8dg4pvfqhjmhggmzk95gcd402'),
    hexId: Wallet.Cardano.PoolIdHex('cf12a9dcaacdc09778616d60502011a88ed4542c482f2ddd08d8ac5a'),
    pledge: BigInt('500000000'),
    status: Wallet.Cardano.StakePoolStatus.Retiring,
    metadata: {
      name: 'Keiths PiTest',
      description: 'Keiths Pi test pool',
      ticker: 'KPIT',
      homepage: ''
    }
  },
  {
    id: Wallet.Cardano.PoolId('pool1fghrkl620rl3g54ezv56weeuwlyce2tdannm2hphs62syf3vyyh'),
    hexId: Wallet.Cardano.PoolIdHex('4a2e3b7f4a78ff1452b91329a7673c77c98ca96dece7b55c37869502'),
    pledge: BigInt('1500000000'),
    status: Wallet.Cardano.StakePoolStatus.Retiring,
    metadata: {
      name: 'VEGASPool',
      description: 'VEGAS TestNet(2) ADA Pool',
      ticker: 'VEGA2',
      homepage: 'https://www.ada.vegas'
    }
  }
];

const getDetailsForAll = (): PoolDetails => ({
  cost: BigInt('6040000'),
  margin: {
    numerator: 1,
    denominator: 50
  },
  owners: [
    Wallet.Cardano.RewardAccount('stake_test1uqrw9tjymlm8wrwq7jk68n6v7fs9qz8z0tkdkve26dylmfc2ux2hj'),
    Wallet.Cardano.RewardAccount('stake_test1uq7g7kqeucnqfweqzgxk3dw34e8zg4swnc7nagysug2mm4cm77jrx')
  ],
  metrics: {
    blocksCreated: 20,
    delegators: 20,
    livePledge: BigInt('2000000000'),
    saturation: Percent(0.95),
    size: undefined,
    stake: undefined,
    ros: Percent(0.69),
    lastRos: Percent(0.88)
  },
  relays: undefined,
  rewardAccount: Wallet.Cardano.RewardAccount('stake_test1uqrw9tjymlm8wrwq7jk68n6v7fs9qz8z0tkdkve26dylmfc2ux2hj'),
  vrf: undefined
});

export const mockedStakePools: Wallet.Cardano.StakePool[] = pools.map((pool) => ({
  ...pool,
  ...getDetailsForAll()
}));
