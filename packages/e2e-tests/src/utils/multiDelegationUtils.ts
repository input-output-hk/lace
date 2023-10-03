import testContext from './testContext';
import { StakePool, StakePoolsData } from '../data/expectedStakePoolsData';

const stakePoolsWithMetadata = [StakePoolsData.adacapital, StakePoolsData.canadaStakes];
const stakePoolsWithoutMetadata = [StakePoolsData.noMetadataPool1, StakePoolsData.noMetadataPool2];

const isStakePoolInUse = async (stakePoolID: string): Promise<boolean> => {
  const stakePoolIDsInUse = (await testContext.load('stakePoolsInUse')) as unknown[];
  return stakePoolIDsInUse.includes(stakePoolID);
};

const getPoolIdOrName = async (stakePools: StakePool[], field: 'id' | 'name') => {
  let result;
  for (const pool of stakePools) {
    if (!(await isStakePoolInUse(pool.poolId))) {
      result = field === 'id' ? pool.poolId : pool.name;
      testContext.save(field === 'id' ? 'currentStakePoolId' : 'currentStakePoolName', result);
      break;
    }
  }
  if (!result) {
    throw new Error('All stake pools defined in test data are in use!');
  }
  return result;
};

export const parseSearchTerm = async (term: string): Promise<string> => {
  let parsedSearchTerm = '';
  switch (term) {
    case 'OtherStakePool':
      parsedSearchTerm = (await getPoolIdOrName(stakePoolsWithMetadata, 'name')) as unknown as string;
      break;
    case 'OtherNoMetadataStakePool':
      parsedSearchTerm = (await getPoolIdOrName(stakePoolsWithoutMetadata, 'id')) as unknown as string;
      break;
    default:
      parsedSearchTerm = term;
  }

  return parsedSearchTerm;
};
