import testContext from './testContext';
import { StakePool, StakePoolsData } from '../data/expectedStakePoolsData';
import { PoolData } from '../assert/transactionDetailsAssert';

const stakePoolsWithMetadata = [StakePoolsData.adaocean, StakePoolsData.canadaStakes];
const stakePoolsWithoutMetadata = [StakePoolsData.noMetadataPool1, StakePoolsData.noMetadataPool2];

const isStakePoolInUse = async (stakePoolID: string): Promise<boolean> => {
  const stakePoolIDsInUse: PoolData[] = testContext.load('stakePoolsInUse');
  const ids = stakePoolIDsInUse.map((s) => s.poolId);
  return ids.includes(stakePoolID);
};

const getPoolFieldValue = async (stakePools: StakePool[], field: 'id' | 'name' | 'ticker') => {
  let result;
  for (const pool of stakePools) {
    if (!(await isStakePoolInUse(pool.poolId))) {
      switch (field) {
        case 'id':
          result = pool.poolId;
          testContext.save('currentStakePoolId', result);
          break;
        case 'name':
          result = pool.name;
          testContext.save('currentStakePoolName', result);
          break;
        case 'ticker':
          result = pool.ticker;
          testContext.save('currentStakePoolTicker', result);
          break;
        default:
          throw new Error(`Unsupported field: ${field}`);
      }
      break;
    }
  }
  if (!result) {
    throw new Error('All stake pools defined in test data are in use!');
  }
  return result;
};

export const parseSearchTerm = async (term: string): Promise<string> => {
  let parsedSearchTerm;
  switch (term) {
    case 'OtherStakePool':
      parsedSearchTerm = (await getPoolFieldValue(stakePoolsWithMetadata, 'ticker')) as unknown as string;
      break;
    case 'OtherNoMetadataStakePool':
      parsedSearchTerm = (await getPoolFieldValue(stakePoolsWithoutMetadata, 'id')) as unknown as string;
      break;
    default:
      parsedSearchTerm = term;
  }

  return parsedSearchTerm;
};
