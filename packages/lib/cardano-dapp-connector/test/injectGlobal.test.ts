import { dummyLogger as logger } from 'ts-log';

import { injectGlobal } from '../src';
import { ApiError } from '../src/errors';
import { Cip30Wallet } from '../src/WalletApi';

import { api, properties, stubAuthenticator } from './testWallet';

import type { RemoteAuthenticator, WindowMaybeWithCardano } from '../src';

// Minimal window stub: injectGlobal only touches `window.cardano`, and the tests
// only read `window.location.hostname`. Typed loosely (as the previous mock-browser
// window was) so the assertions can read `window.cardano[...]` directly.

const createWindow = (): any => ({ location: { hostname: 'localhost' } });

describe('injectGlobal', () => {
  let window: any;

  beforeEach(() => {
    window = createWindow();
  });

  it('creates the cardano scope when not exists, and injects the wallet public API into it', async () => {
    const wallet = new Cip30Wallet(properties, {
      api,
      authenticator: stubAuthenticator(),
      logger,
    });
    expect(window.cardano).not.toBeDefined();
    injectGlobal(window, wallet, logger);
    expect(window.cardano).toBeDefined();
    expect(window.cardano[properties.walletName].name).toBe(
      properties.walletName,
    );
    expect(typeof window.cardano[properties.walletName].apiVersion).toBe(
      'string',
    );
    expect(window.cardano[properties.walletName].icon).toBe(properties.icon);
    expect(
      await window.cardano[properties.walletName].isEnabled(
        window.location.hostname,
      ),
    ).toBe(false);
    await window.cardano[properties.walletName].enable(
      window.location.hostname,
    );
    expect(
      await window.cardano[properties.walletName].isEnabled(
        window.location.hostname,
      ),
    ).toBe(true);
  });

  test('throws ApiError when not allowed', async () => {
    const requestAccess = vi.fn().mockResolvedValueOnce(false);
    const wallet = new Cip30Wallet(properties, {
      api,
      authenticator: { requestAccess } as unknown as RemoteAuthenticator,
      logger,
    });

    injectGlobal(window, wallet, logger);

    await expect(
      window.cardano[properties.walletName].enable(),
    ).rejects.toThrow(ApiError);
  });

  describe('existing cardano object', () => {
    let anotherObj: any;

    beforeEach(() => {
      anotherObj = { anything: 'here', could: 'be' };
      expect(window.cardano).not.toBeDefined();
      window.cardano = {} as WindowMaybeWithCardano;
      window.cardano['another-obj'] = anotherObj;
      expect(window.cardano).toBeDefined();
    });

    it('injects the wallet public API into the existing cardano scope', () => {
      const wallet = new Cip30Wallet(properties, {
        api,
        authenticator: stubAuthenticator(),
        logger,
      });
      expect(window.cardano).toBeDefined();
      injectGlobal(window, wallet, logger);
      expect(window.cardano[properties.walletName].name).toBe(
        properties.walletName,
      );
      expect(typeof window.cardano[properties.walletName].apiVersion).toBe(
        'string',
      );
      expect(window.cardano[properties.walletName].icon).toBe(properties.icon);
      expect(window.cardano[properties.walletName].isEnabled).toBeDefined();
      expect(typeof window.cardano[properties.walletName].isEnabled).toBe(
        'function',
      );
      expect(window.cardano[properties.walletName].enable).toBeDefined();
      expect(typeof window.cardano[properties.walletName].enable).toBe(
        'function',
      );
      // The wallet is read by name; its key order follows the compile
      // target's class-field semantics.
      expect(Object.keys(window.cardano[properties.walletName]).sort()).toEqual(
        [
          'apiVersion',
          'enable',
          'icon',
          'isEnabled',
          'name',
          'supportedExtensions',
        ],
      );
      expect(window.cardano['another-obj']).toBe(anotherObj);
    });

    it('injects the wallet public API using custom injection name', () => {
      const wallet = new Cip30Wallet(properties, {
        api,
        authenticator: stubAuthenticator(),
        logger,
      });
      injectGlobal(window, wallet, logger, 'customKey');
      expect(window.cardano.customKey.name).toBe(properties.walletName);
      expect(Object.keys(window.cardano.customKey).sort()).toEqual([
        'apiVersion',
        'enable',
        'icon',
        'isEnabled',
        'name',
        'supportedExtensions',
      ]);
    });
  });
});
