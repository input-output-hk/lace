import { Cardano } from '@cardano-sdk/core';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import type { MockInstance } from 'vitest';

vi.setConfig({ testTimeout: 10_000 });

describe('config validation', () => {
  let exitSpy: MockInstance<ReturnType<typeof process.exit>> | undefined;

  beforeEach(() => {
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`process.exit unexpectedly called with "${code}"`);
    }) as never);
    vi.clearAllMocks();
    vi.resetModules();
    // Clear any existing environment variables
    Object.keys(process.env).forEach(key => {
      if (key.startsWith('EXPO_PUBLIC_')) {
        delete process.env[key];
      }
    });
  });

  afterEach(() => {
    exitSpy?.mockRestore();
  });

  const createValidEnvironment = (overrides = {}) => ({
    NODE_ENV: 'test',
    EXPO_PUBLIC_POSTHOG_API_URL: 'https://e.lw.iog.io',
    EXPO_PUBLIC_FEATURE_FLAG_CHECK_FREQUENCY_SECONDS: '1800',
    EXPO_PUBLIC_POSTHOG_API_TOKEN: 'test-token',
    EXPO_PUBLIC_DEFAULT_MIDNIGHT_TESTNET_NETWORK_ID: 'undeployed',
    EXPO_PUBLIC_DEFAULT_CARDANO_TESTNET_CHAIN_ID: 'Preprod',
    EXPO_PUBLIC_RECOVERY_PHRASE_VIDEO_URL: 'https://example.com/video',
    EXPO_PUBLIC_COOKIE_POLICY_URL: 'https://example.com/cookie',
    EXPO_PUBLIC_PRIVACY_POLICY_URL: 'https://example.com/privacy',
    EXPO_PUBLIC_TERMS_AND_CONDITIONS_URL: 'https://example.com/terms',
    EXPO_PUBLIC_FAQ_URL: 'https://example.com/faq',
    EXPO_PUBLIC_FAQ_RECOVERY_PHRASE_URL: 'https://example.com/faq-recovery',
    EXPO_PUBLIC_FAQ_COPY_PASTE_RECOVERY_PHRASE_URL:
      'https://example.com/faq-copy',
    EXPO_PUBLIC_ZENDESK_NEW_REQUEST_URL: 'https://example.com/zendesk',
    EXPO_PUBLIC_BANXA_URL: 'https://example.com/banxa',
    EXPO_PUBLIC_GOV_TOOLS_URL: 'https://example.com/gov',
    EXPO_PUBLIC_BLOCKFROST_PROJECT_ID_PREPROD: 'preprod-key',
    EXPO_PUBLIC_BLOCKFROST_PROJECT_ID_PREVIEW: 'preview-key',
    EXPO_PUBLIC_BLOCKFROST_PROJECT_ID_MAINNET: 'mainnet-key',
    EXPO_PUBLIC_LEARN_MORE_URL: 'https://example.com/learn-more',
    EXPO_PUBLIC_URL_LACE_PAGE: 'https://example.com/lace-link',
    EXPO_PUBLIC_NFT_CDN_URL: 'https://example.com/nft-cdn',
    ...overrides,
  });

  const withSilencedConsole = async <T>(
    testFunction: () => Promise<T>,
  ): Promise<T> => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      return await testFunction();
    } finally {
      consoleSpy.mockRestore();
      logSpy.mockRestore();
    }
  };

  describe('validateEnvironment function', () => {
    it('should return valid config when all required environment variables are provided', async () => {
      // Arrange
      const validEnvironment = createValidEnvironment();
      Object.assign(process.env, validEnvironment);

      // Act
      const { appConfig, configValidationError } = await import(
        '../src/app/util/config'
      );

      // Assert
      expect(appConfig).not.toBeNull();
      expect(configValidationError).toBeNull();
      expect(appConfig?.postHogUrl).toBe('https://e.lw.iog.io');
      expect(appConfig?.postHogApiToken).toBe('test-token');
      expect(appConfig?.defaultMidnightTestnetNetworkId).toBe('undeployed');
      expect(appConfig?.defaultTestnetChainId).toBe(Cardano.ChainIds.Preprod);
    });

    it('should return null and set error when required environment variables are missing', async () => {
      await withSilencedConsole(async () => {
        // Arrange
        Object.assign(process.env, {
          NODE_ENV: 'test',
          EXPO_PUBLIC_POSTHOG_API_URL: 'https://e.lw.iog.io',
          // Missing other required variables
        });

        // Act
        const { appConfig, configValidationError } = await import(
          '../src/app/util/config'
        );

        // Assert
        expect(appConfig).toBeNull();
        expect(configValidationError).not.toBeNull();
        expect(configValidationError).toContain('COUNT:');
        expect(configValidationError).toContain('VARS:');
        expect(configValidationError).toContain('ENV:');
      });
    });

    it('should handle empty and TBD values by creating config with invalid data', async () => {
      // Arrange
      const environmentWithEmptyValues = createValidEnvironment({
        EXPO_PUBLIC_POSTHOG_API_URL: '',
        EXPO_PUBLIC_FEATURE_FLAG_CHECK_FREQUENCY_SECONDS: 'TBD',
        EXPO_PUBLIC_POSTHOG_API_TOKEN: '   ',
      });
      Object.assign(process.env, environmentWithEmptyValues);

      // Act
      const { appConfig, configValidationError } = await import(
        '../src/app/util/config'
      );

      // Assert
      expect(appConfig).not.toBeNull();
      expect(configValidationError).toBeNull();
      // Verify that empty values result in empty/invalid config values
      expect(appConfig?.postHogUrl).toBe('');
      expect(appConfig?.postHogApiToken).toBe('   ');
      expect(Number.isNaN(appConfig?.featureFlagCheckFrequency)).toBe(true);
    });
  });

  describe('custom validators', () => {
    describe('cardanoChainId validator', () => {
      it('should accept valid Preprod chain ID', async () => {
        // Arrange
        const validEnvironment = createValidEnvironment({
          EXPO_PUBLIC_DEFAULT_CARDANO_TESTNET_CHAIN_ID: 'Preprod',
        });
        Object.assign(process.env, validEnvironment);

        // Act
        const { appConfig } = await import('../src/app/util/config');

        // Assert
        expect(appConfig?.defaultTestnetChainId).toBe(Cardano.ChainIds.Preprod);
      });

      it('should accept valid Preview chain ID', async () => {
        // Arrange
        const validEnvironment = createValidEnvironment({
          EXPO_PUBLIC_DEFAULT_CARDANO_TESTNET_CHAIN_ID: 'Preview',
        });
        Object.assign(process.env, validEnvironment);

        // Act
        const { appConfig } = await import('../src/app/util/config');

        // Assert
        expect(appConfig?.defaultTestnetChainId).toBe(Cardano.ChainIds.Preview);
      });

      it('should reject invalid chain ID', async () => {
        await withSilencedConsole(async () => {
          // Arrange
          const invalidEnvironment = createValidEnvironment({
            EXPO_PUBLIC_DEFAULT_CARDANO_TESTNET_CHAIN_ID: 'InvalidChain',
          });
          Object.assign(process.env, invalidEnvironment);

          // Act
          const { appConfig, configValidationError } = await import(
            '../src/app/util/config'
          );

          // Assert
          expect(appConfig).toBeNull();
          expect(configValidationError).toContain('COUNT:0');
          expect(configValidationError).toContain('ERROR:Invalid');
        });
      });

      it('should reject Mainnet chain ID', async () => {
        await withSilencedConsole(async () => {
          // Arrange
          const invalidEnvironment = createValidEnvironment({
            EXPO_PUBLIC_DEFAULT_CARDANO_TESTNET_CHAIN_ID: 'Mainnet',
          });
          Object.assign(process.env, invalidEnvironment);

          // Act
          const { appConfig, configValidationError } = await import(
            '../src/app/util/config'
          );

          // Assert
          expect(appConfig).toBeNull();
          expect(configValidationError).toContain('COUNT:0');
          expect(configValidationError).toContain('ERROR:Invalid');
        });
      });
    });

    describe('midnightNetworkId validator', () => {
      it('should accept valid network ID "undeployed"', async () => {
        // Arrange
        const validEnvironment = createValidEnvironment({
          EXPO_PUBLIC_DEFAULT_MIDNIGHT_TESTNET_NETWORK_ID: 'undeployed',
        });
        Object.assign(process.env, validEnvironment);

        // Act
        const { appConfig } = await import('../src/app/util/config');

        // Assert
        expect(appConfig?.defaultMidnightTestnetNetworkId).toBe('undeployed');
      });

      it('should accept valid testnet network ID "preview"', async () => {
        // Arrange
        const validEnvironment = createValidEnvironment({
          EXPO_PUBLIC_DEFAULT_MIDNIGHT_TESTNET_NETWORK_ID: 'preview',
        });
        Object.assign(process.env, validEnvironment);

        // Act
        const { appConfig } = await import('../src/app/util/config');

        // Assert
        expect(appConfig?.defaultMidnightTestnetNetworkId).toBe('preview');
      });

      it('should reject invalid network ID', async () => {
        await withSilencedConsole(async () => {
          // Arrange
          const invalidEnvironment = createValidEnvironment({
            EXPO_PUBLIC_DEFAULT_MIDNIGHT_TESTNET_NETWORK_ID: 'invalid',
          });
          Object.assign(process.env, invalidEnvironment);

          // Act
          const { appConfig, configValidationError } = await import(
            '../src/app/util/config'
          );

          // Assert
          expect(appConfig).toBeNull();
          expect(configValidationError).toContain('COUNT:0');
          expect(configValidationError).toContain('ERROR:Invalid');
        });
      });
    });
  });

  describe('error handling scenarios', () => {
    it('should properly format error message with missing variables count', async () => {
      await withSilencedConsole(async () => {
        // Arrange
        Object.assign(process.env, {
          NODE_ENV: 'development',
          EXPO_PUBLIC_POSTHOG_API_URL: 'https://e.lw.iog.io',
          EXPO_PUBLIC_POSTHOG_API_TOKEN: 'test-token',
          // Missing most other required vars
        });

        // Act
        const { configValidationError } = await import(
          '../src/app/util/config'
        );

        // Assert
        expect(configValidationError).toMatch(/COUNT:\d+/);
        expect(configValidationError).toContain('VARS:');
        expect(configValidationError).toContain('ENV:');
        expect(configValidationError).toContain('Environment: development');
      });
    });

    it('should provide helpful environment file information', async () => {
      await withSilencedConsole(async () => {
        // Arrange
        Object.assign(process.env, {
          NODE_ENV: 'production',
        });

        // Act
        const { configValidationError } = await import(
          '../src/app/util/config'
        );

        // Assert
        expect(configValidationError).toContain(
          '.env.local (highest priority)',
        );
        expect(configValidationError).toContain('.env.production');
        expect(configValidationError).toContain('.env (lowest priority)');
      });
    });

    it('should list specific missing variables in error message', async () => {
      await withSilencedConsole(async () => {
        // Arrange
        Object.assign(process.env, {
          NODE_ENV: 'test',
          EXPO_PUBLIC_POSTHOG_API_URL: 'https://e.lw.iog.io',
          // Missing all others
        });

        // Act
        const { configValidationError } = await import(
          '../src/app/util/config'
        );

        // Assert
        expect(configValidationError).toContain(
          '• EXPO_PUBLIC_POSTHOG_API_TOKEN',
        );
        expect(configValidationError).toContain(
          '• EXPO_PUBLIC_DEFAULT_MIDNIGHT_TESTNET_NETWORK_ID',
        );
        expect(configValidationError).toContain(
          '• EXPO_PUBLIC_DEFAULT_CARDANO_TESTNET_CHAIN_ID',
        );
      });
    });
  });
});
