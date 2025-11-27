/* eslint-disable new-cap, no-magic-numbers */
import { Percent } from '@cardano-sdk/util';
import { Cardano } from '@cardano-sdk/core';
import { StakePoolSearchResults, CoinId } from '@src/wallet';
import { stakePoolTransformer } from '../stake-pool-transformer';

const cardanoCoin: CoinId = {
  id: '1',
  name: 'Cardano',
  decimals: 6,
  symbol: 'ADA'
};

const cardanoStakePoolMock: StakePoolSearchResults = {
  pageResults: [
    {
      cost: BigInt('6040000'),
      hexId: Cardano.PoolIdHex('a76e3a1104a9d816a67d5826a155c9e2979a839d0d944346d47e33ab'),
      id: Cardano.PoolId('pool1syqhydhdzcuqhwtt6q4m63f9g8e7262wzsvk7e0r0njsyjyd0yn'),
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
            id: Cardano.PoolIdHex('a76e3a1104a9d816a67d5826a155c9e2979a839d0d944346d47e33ab')
          }
        }
      },
      metrics: {
        blocksCreated: 20,
        delegators: 20,
        livePledge: BigInt('2000000000'),
        saturation: Percent(0.0512),
        ros: Percent(0.69),
        lastRos: Percent(0.88),
        size: {
          active: Percent(0.0578),
          live: Percent(0.0211)
        },
        stake: {
          live: BigInt('201000000'),
          active: BigInt('101000000')
        }
      },
      owners: [
        Cardano.RewardAccount('stake_test1uqrw9tjymlm8wrwq7jk68n6v7fs9qz8z0tkdkve26dylmfc2ux2hj'),
        Cardano.RewardAccount('stake_test1uq7g7kqeucnqfweqzgxk3dw34e8zg4swnc7nagysug2mm4cm77jrx')
      ],
      pledge: BigInt('2000000000'),
      rewardAccount: Cardano.RewardAccount('stake_test1uqrw9tjymlm8wrwq7jk68n6v7fs9qz8z0tkdkve26dylmfc2ux2hj'),
      status: Cardano.StakePoolStatus.Active,
      vrf: undefined,
      relays: undefined
    }
  ],
  totalResultCount: 1
} as unknown as StakePoolSearchResults;

const transformedStakePool = {
  ros: '69.00',
  cost: {
    number: '6.04',
    unit: ''
  },
  description: 'This is the STTST description',
  hexId: 'a76e3a1104a9d816a67d5826a155c9e2979a839d0d944346d47e33ab',
  id: 'pool1syqhydhdzcuqhwtt6q4m63f9g8e7262wzsvk7e0r0njsyjyd0yn',
  liveStake: {
    number: '201',
    unit: ''
  },
  logo: 'data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2230%22%20height%3D%2230%22%20viewBox%3D%220%200%2030%2030%22%3E%3Cpath%20fill%3D%22%23e3e3e3%22%20d%3D%22M15%209L9%209L9%206ZM15%209L15%203L18%203ZM15%2021L21%2021L21%2024ZM15%2021L15%2027L12%2027ZM9%2015L3%2015L3%2012ZM21%2015L21%209L24%209ZM21%2015L27%2015L27%2018ZM9%2015L9%2021L6%2021Z%22%2F%3E%3Cpath%20fill%3D%22%23464646%22%20d%3D%22M3%206L6%203L9%206L6%209ZM24%203L27%206L24%209L21%206ZM27%2024L24%2027L21%2024L24%2021ZM6%2027L3%2024L6%2021L9%2024Z%22%2F%3E%3Cpath%20fill%3D%22%23599ec7%22%20d%3D%22M11%2011L15%2011L15%2015L11%2015ZM19%2011L19%2015L15%2015L15%2011ZM19%2019L15%2019L15%2015L19%2015ZM11%2019L11%2015L15%2015L15%2019Z%22%2F%3E%3C%2Fsvg%3E',
  margin: '2.00',
  name: 'StakedTestPool',
  owners: [
    'stake_test1uqrw9tjymlm8wrwq7jk68n6v7fs9qz8z0tkdkve26dylmfc2ux2hj',
    'stake_test1uq7g7kqeucnqfweqzgxk3dw34e8zg4swnc7nagysug2mm4cm77jrx'
  ],
  pledge: {
    number: '2',
    unit: 'K'
  },
  retired: false,
  saturation: '5.12',
  ticker: 'STTST',
  blocks: '20',
  stakePool: cardanoStakePoolMock.pageResults[0],
  fee: '6.04'
};

describe('Testing transformers', () => {
  test('should return proper data form stakePoolTransformer', () => {
    expect(stakePoolTransformer({ stakePool: cardanoStakePoolMock.pageResults[0], cardanoCoin })).toEqual(
      transformedStakePool
    );
  });
});
