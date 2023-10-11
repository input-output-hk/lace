export interface StakePool {
  name: string;
  ticker: string;
  information: string;
  poolId: string;
  owners: string[];
}

const adacapital: StakePool = {
  name: 'ADA Capital',
  ticker: 'ADACT',
  information: 'ADA Capital - PreProd Pool',
  poolId: 'pool132jxjzyw4awr3s75ltcdx5tv5ecv6m042306l630wqjckhfm32r',
  owners: ['stake_test1up3hm9j74c560trk9enccpc269wc9xfn4ah8ax8jp3rwtdgtr58qe']
};

const adacapitalMainnet: StakePool = {
  name: 'ADA Capital',
  ticker: 'ADACT',
  information: 'ADA Capital - Mainnet Pool',
  poolId: 'pool1y24nj4qdkg35nvvnfawukauggsxrxuy74876cplmxsee29w5axc',
  owners: ['stake1u8a9qstrmj4rvc3k5z8fems7f0j2vztz8det2klgakhfc8ce79fma']
};

const canadaStakes: StakePool = {
  name: 'CanadaStakes',
  ticker: 'CAN1',
  information:
    // eslint-disable-next-line max-len
    'To advance the cardano community in canada through assistance, knowledge, interactive events and support for local charities, while providing a stable staking platform for our delegators.',
  poolId: 'pool1vvkurfxhajtj4f7x8wjkeet7rg8amz34duy5nux76per5sn3npx',
  owners: ['stake_test1urkaxwavpp37j083cvafwymnpmqm5wl6hre4ev99pcyt3tcvq0gns']
};

const noMetadataPool1: StakePool = {
  name: '-',
  ticker: '-',
  information: '-',
  poolId: 'pool1z7kuc2r7jgfmvuw0fazqzs8phcgfl64kmdmcsq7z440v578ekw8',
  owners: ['stake_test1urja3qejr8u0gdl5lpq9mcqzqjgdl9duyqy850wd4w3flgqv7mcrs']
};

const noMetadataPool2: StakePool = {
  name: '-',
  ticker: '-',
  information: '-',
  poolId: 'pool1z063uemr7k9zzg95ymz0gfqnfv5k58et8xrnk6ynfyqdgjjw0e7',
  owners: ['stake_test1ur97646x6f523xx9k89d6tt0c2td3pfvczw903zu2qa8syqal0s9h']
};

export const StakePoolsData = { adacapital, canadaStakes, noMetadataPool1, noMetadataPool2, adacapitalMainnet };
const StakePoolsArray: StakePool[] = [adacapital, canadaStakes, noMetadataPool1, noMetadataPool2, adacapitalMainnet];

export const StakePoolsDataMainnet = { adacapitalMainnet };
const StakePoolsMainnetArray: StakePool[] = [adacapitalMainnet];

export const getStakePoolByName = (name: string | number, network?: 'testnet' | 'mainnet'): StakePool => {
  const expectedPools = network === 'mainnet' ? StakePoolsMainnetArray : StakePoolsArray;
  for (const pool of expectedPools) {
    if (pool.name === name) {
      return pool;
    }
  }
  throw new Error(`StakePool with name ${name} not found`);
};

export const getStakePoolById = (id: string, network?: 'testnet' | 'mainnet'): StakePool => {
  const expectedPools = network === 'mainnet' ? StakePoolsMainnetArray : StakePoolsArray;
  for (const pool of expectedPools) {
    if (pool.poolId === id) {
      console.info(`returning pool${pool.poolId} ${pool.name}`);
      return pool;
    }
  }
  throw new Error(`StakePool with id ${id} not found`);
};
