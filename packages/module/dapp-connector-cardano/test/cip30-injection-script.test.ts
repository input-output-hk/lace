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
  createInjectionScript,
  defaultConfig,
  generateCip30InjectionScript,
  type InjectionScriptConfig,
} from '../src/mobile/injection';

const testConfig: InjectionScriptConfig = {
  ...defaultConfig,
  bridgeToken: 'test-bridge-token',
};

describe('cip30-injection-script', () => {
  describe('defaultConfig', () => {
    it('has expected default values', () => {
      expect(defaultConfig.walletName).toBe(WALLET_NAME);
      expect(defaultConfig.apiVersion).toBe(CIP30_API_VERSION);
      expect(defaultConfig.walletIcon).toBe(WALLET_ICON);
      expect(defaultConfig.supportedExtensions).toEqual([
        { cip: 95 },
        { cip: 142 },
      ]);
      expect(defaultConfig.requestTimeout).toBe(60000);
      expect(typeof defaultConfig.debug).toBe('boolean');
    });

    it('does not carry a bridge token (it must be per-instance)', () => {
      expect('bridgeToken' in defaultConfig).toBe(false);
    });
  });

  describe('generateCip30InjectionScript', () => {
    it('generates script with the provided config', () => {
      const script = generateCip30InjectionScript(testConfig);

      expect(script).toContain('window.__LACE_CIP30_CONFIG__');
      expect(script).toContain(WALLET_NAME);
      expect(script).toContain(CIP30_API_VERSION);
    });

    it('embeds the bridge token in the injected config', () => {
      const script = generateCip30InjectionScript(testConfig);

      expect(script).toContain('"bridgeToken":"test-bridge-token"');
    });

    it('generates script with custom config', () => {
      const customConfig: InjectionScriptConfig = {
        ...testConfig,
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
      const config: InjectionScriptConfig = {
        ...testConfig,
        supportedExtensions: [{ cip: 30 }, { cip: 95 }],
      };

      const script = generateCip30InjectionScript(config);

      expect(script).toContain('"supportedExtensions":[{"cip":30},{"cip":95}]');
    });

    it('includes the WebView runtime source', () => {
      const script = generateCip30InjectionScript(testConfig);

      // The script should have content beyond just the config line
      const configLineEnd = script.indexOf('\n');
      const restOfScript = script.slice(configLineEnd + 1);

      expect(restOfScript.length).toBeGreaterThan(0);
    });
  });

  describe('runtime source hardening', () => {
    it('reads the token from config and never exposes it on window', () => {
      const script = generateCip30InjectionScript(testConfig);
      const runtime = script.slice(script.indexOf('\n') + 1);

      // The runtime reads the token from the injected config...
      expect(runtime).toContain('CONFIG.bridgeToken');
      // ...and stamps token + document nonce on every outgoing envelope.
      expect(runtime).toContain('token: BRIDGE_TOKEN');
      expect(runtime).toContain('nonce: DOCUMENT_NONCE');
      // ...and rejects a response addressed to a different document.
      expect(runtime).toContain('nonce !== DOCUMENT_NONCE');
      // The token must stay in the closure — never assigned to a window prop.
      expect(runtime).not.toContain('window.bridgeToken');
      expect(runtime).not.toContain('window.BRIDGE_TOKEN');
    });
  });

  describe('createInjectionScript', () => {
    it('is an alias for generateCip30InjectionScript', () => {
      expect(createInjectionScript).toBe(generateCip30InjectionScript);
    });

    it('works with partial config override', () => {
      const script = createInjectionScript({
        ...testConfig,
        debug: true,
      });

      expect(script).toContain('"debug":true');
    });
  });
});
