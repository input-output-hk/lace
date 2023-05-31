/* eslint-disable no-magic-numbers */
// Used in storybook
import { Cardano } from '@cardano-sdk/core';

// eslint-disable-next-line no-console
export const createSingleAddressWallet = (): void => console.log('createSigleAddressWallet mock');

export const stakePoolMock: Cardano.StakePool = {
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
    saturation: Cardano.Percent(0.5),
    stake: undefined,
    size: undefined
  },
  owners: [
    Cardano.RewardAccount('stake_test1uqrw9tjymlm8wrwq7jk68n6v7fs9qz8z0tkdkve26dylmfc2ux2hj'),
    Cardano.RewardAccount('stake_test1uq7g7kqeucnqfweqzgxk3dw34e8zg4swnc7nagysug2mm4cm77jrx')
  ],
  pledge: BigInt('2000000000'),
  epochRewards: [],
  rewardAccount: Cardano.RewardAccount('stake_test1uqrw9tjymlm8wrwq7jk68n6v7fs9qz8z0tkdkve26dylmfc2ux2hj'),
  status: Cardano.StakePoolStatus.Active,
  transactions: undefined,
  vrf: undefined,
  relays: undefined
};

export const rewardAcountMock: Partial<Cardano.RewardAccountInfo> = {
  address: Cardano.RewardAccount('stake_test1urm7tqwy3d5e3kxp424cvtcgr8zaprkszk38jntyzu5t4mqalgvfg'),
  keyStatus: Cardano.StakeKeyStatus.Registered,

  delegatee: {
    nextNextEpoch: stakePoolMock
  },
  rewardBalance: BigInt('0')
};
