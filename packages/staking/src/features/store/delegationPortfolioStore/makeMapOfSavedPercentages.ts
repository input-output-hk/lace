import { Wallet } from '@lace/cardano';
import { PERCENTAGE_SCALE_MAX } from './constants';
import { sanitizePercentages } from './stateMachine';

export const makeMapOfSavedPercentages = (pools?: Wallet.Cardano.Cip17Pool[]) => {
  if (!pools) return {} as Record<Wallet.Cardano.PoolIdHex, number>;

  const weightsSum = pools.reduce((acc, { weight }) => acc + weight, 0);
  let portfolioWithSavedPercentages = pools.map((pool) => ({
    ...pool,
    percentage: (pool.weight / weightsSum) * PERCENTAGE_SCALE_MAX,
  }));

  portfolioWithSavedPercentages = sanitizePercentages({
    decimals: 0,
    items: portfolioWithSavedPercentages,
    key: 'percentage',
  });

  return portfolioWithSavedPercentages.reduce<Record<Wallet.Cardano.PoolIdHex, number>>((acc, { percentage, id }) => {
    acc[id] = percentage;
    return acc;
  }, {});
};
