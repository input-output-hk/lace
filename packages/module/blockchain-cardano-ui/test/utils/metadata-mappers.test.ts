import { describe, expect, it } from 'vitest';

import { displayMetadataValue } from '../../src/utils/metadata-mappers';

describe('displayMetadataValue', () => {
  it('should return string values as-is', () => {
    expect(displayMetadataValue('test string')).toBe('test string');
  });

  it('should return empty string for non-array values', () => {
    expect(displayMetadataValue(123 as unknown as unknown[])).toBe('');
  });

  it('should extract message from array with msg property', () => {
    const value = [{ msg: 'Test message' }, { other: 'data' }];
    expect(displayMetadataValue(value)).toBe('Test message');
  });

  it('should extract info from complex objects', () => {
    const value = [{ id: 'pool123', weight: '100' }];
    expect(displayMetadataValue(value)).toBe('id: pool123, weight: 100');
  });

  it('should handle nested arrays', () => {
    const value = [['item1', 'item2']];
    expect(displayMetadataValue(value)).toBe('item1, item2');
  });

  it('should fallback to JSON for unrecognized structures', () => {
    const value = [{ complex: { nested: { data: 'value' } } }];
    expect(displayMetadataValue(value)).toContain('complex');
  });
});
