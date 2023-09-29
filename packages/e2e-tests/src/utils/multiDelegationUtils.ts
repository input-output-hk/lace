import testContext from './testContext';
import { StakePoolsData } from '../data/expectedStakePoolsData';

const isStakePoolInUse = async (stakePoolID: string): Promise<boolean> => {
  const stakePoolIDsInUse = (await testContext.load('stakePoolsInUse')) as unknown[];
  return stakePoolIDsInUse.includes(stakePoolID);
};

export const parseSearchTerm = async (term: string): Promise<string> => {
  let parsedSearchTerm;
  switch (term) {
    case 'OtherStakePool':
      if (await isStakePoolInUse(StakePoolsData.adacapital.poolId)) {
        parsedSearchTerm = StakePoolsData.canadaStakes.name;
      } else if (await isStakePoolInUse(StakePoolsData.canadaStakes.poolId)) {
        parsedSearchTerm = StakePoolsData.adacapital.name;
      } else {
        throw new Error('All stake pools with metadata defined in test data are in use!');
      }
      break;
    case 'OtherNoMetadataStakePool':
      if (await isStakePoolInUse(StakePoolsData.noMetadataPool1.poolId)) {
        parsedSearchTerm = StakePoolsData.noMetadataPool2.name;
      } else if (await isStakePoolInUse(StakePoolsData.noMetadataPool2.poolId)) {
        parsedSearchTerm = StakePoolsData.noMetadataPool1.name;
      } else {
        throw new Error('All stake pools without metadata defined in test data are in use!');
      }
      break;
    default:
      parsedSearchTerm = term;
  }

  return parsedSearchTerm;
};
