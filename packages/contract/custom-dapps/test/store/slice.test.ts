import { describe, expect, it } from 'vitest';

import {
  customDappsActions as actions,
  customDappsReducers,
  customDappsSelectors as selectors,
} from '../../src/store/slice';
import { CustomDappId } from '../../src/value-objects';

import type { CustomDappsSliceState } from '../../src/store/slice';

type TestState = { customDapps: CustomDappsSliceState };

const baseState: CustomDappsSliceState = { customDappList: [] };

describe('customDapps slice', () => {
  describe('addCustomDapp', () => {
    it('adds a new dapp with hostname-derived name when name omitted', () => {
      const state = customDappsReducers.customDapps(
        baseState,
        actions.customDapps.addCustomDapp({
          url: 'https://www.minswap.org/swap',
        }),
      );
      expect(state.customDappList).toHaveLength(1);
      expect(state.customDappList[0]).toMatchObject({
        id: 'https://www.minswap.org/swap',
        name: 'minswap.org',
        url: 'https://www.minswap.org/swap',
      });
      expect(typeof state.customDappList[0].addedAt).toBe('number');
    });

    it('uses provided name when supplied', () => {
      const state = customDappsReducers.customDapps(
        baseState,
        actions.customDapps.addCustomDapp({
          url: 'https://example.com',
          name: 'My DApp',
        }),
      );
      expect(state.customDappList[0].name).toBe('My DApp');
    });

    it('dedupes by normalized URL (trailing slash and hash stripped)', () => {
      const afterFirst = customDappsReducers.customDapps(
        baseState,
        actions.customDapps.addCustomDapp({ url: 'https://example.com/' }),
      );
      const afterSecond = customDappsReducers.customDapps(
        afterFirst,
        actions.customDapps.addCustomDapp({
          url: 'https://example.com#section',
        }),
      );
      expect(afterSecond.customDappList).toHaveLength(1);
      expect(afterSecond.customDappList[0].id).toBe('https://example.com');
    });

    it('trims provided name', () => {
      const state = customDappsReducers.customDapps(
        baseState,
        actions.customDapps.addCustomDapp({
          url: 'https://example.com',
          name: '  Spaced  ',
        }),
      );
      expect(state.customDappList[0].name).toBe('Spaced');
    });
  });

  describe('removeCustomDapp', () => {
    const seededState = customDappsReducers.customDapps(
      baseState,
      actions.customDapps.addCustomDapp({ url: 'https://example.com' }),
    );

    it('removes the dapp matching the id', () => {
      const state = customDappsReducers.customDapps(
        seededState,
        actions.customDapps.removeCustomDapp(
          CustomDappId('https://example.com'),
        ),
      );
      expect(state.customDappList).toHaveLength(0);
    });

    it('leaves list untouched when id not found', () => {
      const state = customDappsReducers.customDapps(
        seededState,
        actions.customDapps.removeCustomDapp(CustomDappId('https://other.com')),
      );
      expect(state.customDappList).toHaveLength(1);
    });
  });

  describe('editCustomDapp', () => {
    const seededState = customDappsReducers.customDapps(
      baseState,
      actions.customDapps.addCustomDapp({
        url: 'https://example.com',
        name: 'Original',
      }),
    );

    it('updates name without changing id when url is unchanged', () => {
      const state = customDappsReducers.customDapps(
        seededState,
        actions.customDapps.editCustomDapp({
          id: CustomDappId('https://example.com'),
          url: 'https://example.com',
          name: 'Renamed',
        }),
      );
      expect(state.customDappList).toHaveLength(1);
      expect(state.customDappList[0].id).toBe('https://example.com');
      expect(state.customDappList[0].name).toBe('Renamed');
    });

    it('updates url and re-normalizes id', () => {
      const state = customDappsReducers.customDapps(
        seededState,
        actions.customDapps.editCustomDapp({
          id: CustomDappId('https://example.com'),
          url: 'https://example.com/new-path/',
          name: 'Original',
        }),
      );
      expect(state.customDappList[0].id).toBe('https://example.com/new-path');
      expect(state.customDappList[0].url).toBe('https://example.com/new-path/');
    });

    it('refuses to overwrite an existing dapp when changed url collides', () => {
      const withTwo = customDappsReducers.customDapps(
        seededState,
        actions.customDapps.addCustomDapp({
          url: 'https://other.com',
          name: 'Other',
        }),
      );
      const state = customDappsReducers.customDapps(
        withTwo,
        actions.customDapps.editCustomDapp({
          id: CustomDappId('https://example.com'),
          url: 'https://other.com',
        }),
      );
      expect(state.customDappList).toHaveLength(2);
      expect(
        state.customDappList.find(d => d.id === 'https://example.com')?.url,
      ).toBe('https://example.com');
    });

    it('does nothing when id not found', () => {
      const state = customDappsReducers.customDapps(
        seededState,
        actions.customDapps.editCustomDapp({
          id: CustomDappId('https://nonexistent.com'),
          url: 'https://nonexistent.com',
        }),
      );
      expect(state.customDappList).toHaveLength(1);
      expect(state.customDappList[0].id).toBe('https://example.com');
    });
  });

  describe('selectors', () => {
    const seededState: TestState = {
      customDapps: customDappsReducers.customDapps(
        baseState,
        actions.customDapps.addCustomDapp({ url: 'https://example.com/' }),
      ),
    };

    it('selectCustomDappList returns the saved list', () => {
      expect(
        selectors.customDapps.selectCustomDappList(seededState),
      ).toHaveLength(1);
    });

    it('selectIsUrlSaved returns true for a saved URL (normalized match)', () => {
      expect(
        selectors.customDapps.selectIsUrlSaved(
          seededState,
          'https://example.com',
        ),
      ).toBe(true);
    });

    it('selectIsUrlSaved returns true for a saved URL with trailing slash and hash', () => {
      expect(
        selectors.customDapps.selectIsUrlSaved(
          seededState,
          'https://example.com/#anchor',
        ),
      ).toBe(true);
    });

    it('selectIsUrlSaved returns false for an unsaved URL', () => {
      expect(
        selectors.customDapps.selectIsUrlSaved(
          seededState,
          'https://other.com',
        ),
      ).toBe(false);
    });

    it('selectCustomDappById returns the matching dapp', () => {
      expect(
        selectors.customDapps.selectCustomDappById(
          seededState,
          CustomDappId('https://example.com'),
        )?.url,
      ).toBe('https://example.com/');
    });

    it('selectCustomDappById returns undefined when not found', () => {
      expect(
        selectors.customDapps.selectCustomDappById(
          seededState,
          CustomDappId('https://nonexistent.com'),
        ),
      ).toBeUndefined();
    });
  });
});
