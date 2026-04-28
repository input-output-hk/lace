import { describe, expect, it, vi } from 'vitest';

// Define __DEV__ before any imports that use it
vi.hoisted(() => {
  // @ts-expect-error __DEV__ is a React Native global
  globalThis.__DEV__ = false;
});

import {
  CIP30_API_VERSION,
  WALLET_ICON,
  WALLET_NAME,
} from '../src/common/const';
import {
  CIP30_INJECTION_SCRIPT,
  createInjectionScript,
  defaultConfig,
  generateCip30InjectionScript,
} from '../src/mobile/injection';

describe('cip30-injection-script', () => {
  describe('defaultConfig', () => {
    it('has expected default values', () => {
      expect(defaultConfig.walletName).toBe(WALLET_NAME);
      expect(defaultConfig.apiVersion).toBe(CIP30_API_VERSION);
      expect(defaultConfig.walletIcon).toBe(WALLET_ICON);
      expect(defaultConfig.supportedExtensions).toEqual([{ cip: 95 }]);
      expect(defaultConfig.requestTimeout).toBe(60000);
      expect(typeof defaultConfig.debug).toBe('boolean');
    });
  });

  describe('generateCip30InjectionScript', () => {
    it('generates script with default config when no config provided', () => {
      const script = generateCip30InjectionScript();

      expect(script).toContain('window.__LACE_CIP30_CONFIG__');
      expect(script).toContain(WALLET_NAME);
      expect(script).toContain(CIP30_API_VERSION);
    });

    it('generates script with custom config', () => {
      const customConfig = {
        ...defaultConfig,
        walletName: 'custom-wallet',
        apiVersion: '1.0.0',
        requestTimeout: 30000,
        debug: true,
      };

      const script = generateCip30InjectionScript(customConfig);

      expect(script).toContain('window.__LACE_CIP30_CONFIG__');
      expect(script).toContain('"walletName":"custom-wallet"');
      expect(script).toContain('"apiVersion":"1.0.0"');
      expect(script).toContain('"requestTimeout":30000');
      expect(script).toContain('"debug":true');
    });

    it('serializes supportedExtensions correctly', () => {
      const config = {
        ...defaultConfig,
        supportedExtensions: [{ cip: 30 }, { cip: 95 }],
      };

      const script = generateCip30InjectionScript(config);

      expect(script).toContain('"supportedExtensions":[{"cip":30},{"cip":95}]');
    });

    it('includes the WebView runtime source', () => {
      const script = generateCip30InjectionScript();

      // The script should have content beyond just the config line
      const configLineEnd = script.indexOf('\n');
      const restOfScript = script.slice(configLineEnd + 1);

      expect(restOfScript.length).toBeGreaterThan(0);
    });
  });

  describe('CIP30_INJECTION_SCRIPT', () => {
    it('is pre-generated with default config', () => {
      expect(CIP30_INJECTION_SCRIPT).toBeDefined();
      expect(typeof CIP30_INJECTION_SCRIPT).toBe('string');
      expect(CIP30_INJECTION_SCRIPT).toContain('window.__LACE_CIP30_CONFIG__');
    });

    it('matches script generated with default config', () => {
      const generated = generateCip30InjectionScript(defaultConfig);
      expect(CIP30_INJECTION_SCRIPT).toBe(generated);
    });
  });

  describe('createInjectionScript', () => {
    it('is an alias for generateCip30InjectionScript', () => {
      expect(createInjectionScript).toBe(generateCip30InjectionScript);
    });

    it('works with partial config override', () => {
      const script = createInjectionScript({
        ...defaultConfig,
        debug: true,
      });

      expect(script).toContain('"debug":true');
    });
  });
});
