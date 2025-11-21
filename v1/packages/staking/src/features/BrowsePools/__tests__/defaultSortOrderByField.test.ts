/* eslint-disable unicorn/no-useless-undefined */
import { getDefaultSortOrderByField } from '../utils';

describe('getDefaultSortOrderByField', () => {
  it('returns asc', () => {
    const tickerOrder = getDefaultSortOrderByField('ticker');
    const costOrder = getDefaultSortOrderByField('cost');
    const marginOrder = getDefaultSortOrderByField('margin');

    expect(tickerOrder).toEqual('asc');
    expect(costOrder).toEqual('asc');
    expect(marginOrder).toEqual('asc');
  });

  it('returns desc', () => {
    const pledgeOrder = getDefaultSortOrderByField('pledge');
    expect(pledgeOrder).toEqual('desc');
  });
});
