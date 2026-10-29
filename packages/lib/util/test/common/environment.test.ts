import {
  Environment,
  getEnvironmentConfiguration,
  isBackgroundProcess,
  isProductionEnvironment,
} from '../../src/common';

describe('environment', () => {
  const nodeEnv = process.env.NODE_ENV;
  afterEach(() => {
    process.env.NODE_ENV = nodeEnv;
  });

  it('reads production from NODE_ENV and defaults to development', () => {
    process.env.NODE_ENV = 'production';
    expect(isProductionEnvironment()).toBe(true);
    expect(getEnvironmentConfiguration()).toBe(Environment.Production);

    process.env.NODE_ENV = 'test';
    expect(isProductionEnvironment()).toBe(false);
    expect(getEnvironmentConfiguration()).toBe(Environment.Development);
  });

  it('isBackgroundProcess is true without a window and for a generated background page', () => {
    expect(typeof window).toBe('undefined');
    expect(isBackgroundProcess()).toBe(true);

    vi.stubGlobal('window', {
      location: { href: 'moz-extension://id/_generated_background_page.html' },
    });
    expect(isBackgroundProcess()).toBe(true);
    vi.stubGlobal('window', { location: { href: 'https://example.com/' } });
    expect(isBackgroundProcess()).toBe(false);
    vi.unstubAllGlobals();
  });
});
