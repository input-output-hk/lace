import { isInternalLink } from '../is-internal-link';

describe('Testing isInternalLink function', () => {
  test('should return true', () => {
    const result = isInternalLink('/setup/create');
    expect(result).toBe(true);
  });

  test('should return false', () => {
    const result = isInternalLink('/setup/create/new');
    expect(result).toBe(false);
  });
});
