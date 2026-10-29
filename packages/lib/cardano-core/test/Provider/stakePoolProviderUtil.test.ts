import {
  PoolAPYSortFields,
  PoolDataSortFields,
  PoolMetricsSortFields,
  PoolROSSortFields,
  SortFields,
  isPoolAPYSortField,
  isPoolDataSortField,
  isPoolMetricsSortField,
  isPoolROSSortField,
} from '../../src';

describe('StakePoolProvider sort fields', () => {
  it('each guard accepts its own fields and rejects the others', () => {
    for (const field of PoolDataSortFields) {
      expect(isPoolDataSortField(field)).toBe(true);
      expect(isPoolMetricsSortField(field)).toBe(false);
    }
    for (const field of PoolMetricsSortFields) {
      expect(isPoolMetricsSortField(field)).toBe(true);
      expect(isPoolAPYSortField(field)).toBe(false);
    }
    for (const field of PoolAPYSortFields) {
      expect(isPoolAPYSortField(field)).toBe(true);
      expect(isPoolROSSortField(field)).toBe(false);
    }
    for (const field of PoolROSSortFields) {
      expect(isPoolROSSortField(field)).toBe(true);
      expect(isPoolDataSortField(field)).toBe(false);
    }
    expect(isPoolDataSortField('nope')).toBe(false);
  });

  it('SortFields is the union of the four groups', () => {
    expect(SortFields).toEqual([
      ...PoolDataSortFields,
      ...PoolMetricsSortFields,
      ...PoolAPYSortFields,
      ...PoolROSSortFields,
    ]);
  });
});
