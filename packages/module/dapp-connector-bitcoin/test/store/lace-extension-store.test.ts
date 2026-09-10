import { describe, expect, it, vi } from 'vitest';

vi.mock('webextension-polyfill', () => ({ runtime: {} }));

import { promptBitcoinAuthorizeDapp } from '../../src/store/authorize-dapp-util';
import laceExtensionStore from '../../src/store/lace-extension-store';
import {
  closeRequestedPopup,
  connectBitcoinDappConnectorApi,
  resolveForeignPsbtInputs,
} from '../../src/store/side-effects';
import {
  bitcoinDappConnectorActions,
  bitcoinDappConnectorSelectors,
} from '../../src/store/slice';

import type { LaceInit, LaceModuleStoreInit } from '@lace-contract/module';

describe('lace-extension-store', () => {
  it('exposes the slice actions and selectors eagerly', () => {
    expect(laceExtensionStore.context.actions).toBe(
      bitcoinDappConnectorActions,
    );
    expect(laceExtensionStore.context.selectors).toBe(
      bitcoinDappConnectorSelectors,
    );
  });

  it('lazily loads a store init with reducers, side effects and persistence', async () => {
    const { default: init } = (await laceExtensionStore.load()) as {
      default: LaceInit<LaceModuleStoreInit>;
    };
    const store = await init(
      {} as never,
      { logger: { debug: vi.fn(), error: vi.fn() } } as never,
    );

    expect(store.reducers).toHaveProperty('bitcoinDappConnector');
    expect(store.sideEffects).toEqual([
      connectBitcoinDappConnectorApi,
      resolveForeignPsbtInputs,
      promptBitcoinAuthorizeDapp,
      closeRequestedPopup,
    ]);
    expect(store.sideEffectDependencies).toHaveProperty(
      'connectBitcoinDappConnector',
    );
    expect(store.persistConfig).toEqual({
      bitcoinDappConnector: {
        version: 1,
        whitelist: ['sessionAccountByOrigin'],
      },
    });
  });
});
