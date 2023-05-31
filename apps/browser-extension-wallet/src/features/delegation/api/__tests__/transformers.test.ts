import { stakePoolTransformer } from '../transformers';
import { cardanoStakePoolMock, transformedStakePool } from '../../../../utils/mocks/test-helpers';
import { cardanoCoin } from '@src/utils/constants';

describe('Testing transformers', () => {
  test('should return proper data form stakePoolTransformer', () => {
    expect(stakePoolTransformer({ stakePool: cardanoStakePoolMock.pageResults[0], cardanoCoin })).toEqual(
      transformedStakePool
    );
  });
});
