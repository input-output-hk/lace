export interface StakePool {
  name: string;
  ticker: string;
  information: string;
  poolId: string;
  owners: string[];
}

const adaocean: StakePool = {
  name: 'ADA Ocean',
  ticker: 'OCEAN',
  information: 'Cloud based reliable stake pool cluster',
  poolId: 'pool129n0d9zrla7ntfjlwhqrtmn7halem0shcjd5mz5zhfym2auyu05',
  owners: ['stake_test1uq3j8w969529ny6m3pazdtherkq5ekgx3v8z62s9aszcuhg7mfj0q']
};

const adacapitalMainnet: StakePool = {
  name: 'ADA Capital',
  ticker: 'ADACT',
  information: 'ADA Capital - Mainnet Pool',
  poolId: 'pool1y24nj4qdkg35nvvnfawukauggsxrxuy74876cplmxsee29w5axc',
  owners: ['stake1u8a9qstrmj4rvc3k5z8fems7f0j2vztz8det2klgakhfc8ce79fma']
};

const azureAda: StakePool = {
  name: 'AzureADA',
  ticker: 'AZUR',
  information: 'AzureADA Preprod testnet',
  poolId: 'pool1njr03m7t9k808fcav8phxnskacr4v59w5cnqgqsgnug2j2lvn85',
  owners: ['stake_test1uqecgdad0vm478qlms7jtq6kv786jfg28ak0cq0gffdhcfq6cmnml']
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

export const StakePoolsData = { adaocean, canadaStakes, noMetadataPool1, noMetadataPool2, adacapitalMainnet };
const StakePoolsArray: StakePool[] = [
  adaocean,
  canadaStakes,
  noMetadataPool1,
  noMetadataPool2,
  adacapitalMainnet,
  azureAda
];

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
      return pool;
    }
  }
  throw new Error(`StakePool with id ${id} not found`);
};

export const getStakePoolByTicker = (ticker: string, network?: 'testnet' | 'mainnet'): StakePool => {
  const expectedPools = network === 'mainnet' ? StakePoolsMainnetArray : StakePoolsArray;
  for (const pool of expectedPools) {
    if (pool.ticker === ticker) {
      return pool;
    }
  }
  throw new Error(`StakePool with ticker ${ticker} not found`);
};
