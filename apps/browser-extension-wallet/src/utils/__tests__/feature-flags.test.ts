import { isFeatureEnabled } from '../feature-flags';

describe('Feature Flags: isFeatureEnabled', () => {
  it('should return true if the feature is enabled', () => {
    process.env.USE_ADA_HANDLE = 'true';
    expect(isFeatureEnabled('ADA_HANDLE')).toBe(true);
  });

  it('should return false if the feature is disabled', () => {
    process.env.USE_ADA_HANDLE = 'false';
    expect(isFeatureEnabled('ADA_HANDLE')).toBe(false);
  });

  it('should throw an error if the feature is not set', () => {
    delete process.env.USE_ADA_HANDLE;
    expect(() => isFeatureEnabled('ADA_HANDLE')).toThrowError("'USE_ADA_HANDLE' is not set");
  });
});
