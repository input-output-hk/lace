import { isInternalLink } from '../is-internal-link';

describe('Testing isInternalLink function', () => {
  test('should return true', () => {
    expect(isInternalLink('/setup/create')).toBe(true);
    expect(isInternalLink('/')).toBe(true);
  });

  test('should return false', () => {
    const result = isInternalLink('/setup/create/new');
    expect(result).toBe(false);
  });
});
