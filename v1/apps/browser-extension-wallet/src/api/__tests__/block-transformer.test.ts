import '@testing-library/jest-dom';
import { blockTransformer } from '../transformers';
import { blockMock, formatBlockMock } from '../../utils/mocks/test-helpers';

describe('Testing blockTransformer function', () => {
  test('should format block information', () => {
    const result = blockTransformer(blockMock);
    expect(result).toEqual(formatBlockMock);
  });

  test.todo('blockTransformer > test more conditions');
});
