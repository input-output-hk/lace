import { Percent } from '@cardano-sdk/util';
import { Wallet } from '@lace/cardano';
import stakePoolsRaw from './data.json';

export const stakePoolsMock = stakePoolsRaw.map<Wallet.Cardano.StakePool>((pool) => ({
  ...pool,
  cost: BigInt(pool.cost),
  hexId: Wallet.Cardano.PoolIdHex(pool.hexId),
  id: Wallet.Cardano.PoolId(pool.id),
  // @ts-ignore
  metadataJson: pool.metadataJson,
  metrics: {
    ...pool.metrics,
    livePledge: BigInt(pool.metrics.livePledge),
    // eslint-disable-next-line new-cap
    saturation: Percent(pool.metrics.saturation),
    size: {
      ...pool.metrics.size,
      // eslint-disable-next-line new-cap
      active: Percent(pool.metrics.size.active),
      // eslint-disable-next-line new-cap
      live: Percent(pool.metrics.size.live),
    },
    stake: {
      ...pool.metrics.stake,
      active: BigInt(pool.metrics.stake.active),
      live: BigInt(pool.metrics.stake.live),
    },
  },
  owners: pool.owners.map((owner) => Wallet.Cardano.RewardAccount(owner)),
  pledge: BigInt(pool.pledge),
  // @ts-ignore
  relays: pool.relays,
  rewardAccount: Wallet.Cardano.RewardAccount(pool.rewardAccount),
  status: pool.status as Wallet.Cardano.StakePoolStatus,
  vrf: Wallet.Cardano.VrfVkHex(pool.vrf),
}));
