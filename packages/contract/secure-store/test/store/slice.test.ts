import { describe, expect, it } from 'vitest';

import {
  initialState,
  secureStoreReducers,
  secureStoreActions,
  secureStoreSelectors,
} from '../../src/store/slice';

import type { SecureStoreSliceState } from '../../src/store/slice';

describe('secureStore slice', () => {
  describe('reducers', () => {
    it('transitions to state Available when availabilityChecked had available: true', () => {
      const nextState = secureStoreReducers.secureStore(
        initialState,
        secureStoreActions.secureStore.availabilityChecked({ available: true }),
      );

      expect(nextState).toEqual({
        status: 'Available',
      });
    });

    it('transitions to state NotAvailable when availabilityChecked had available: false', () => {
      const nextState = secureStoreReducers.secureStore(
        initialState,
        secureStoreActions.secureStore.availabilityChecked({
          available: false,
        }),
      );

      expect(nextState).toEqual({
        status: 'NotAvailable',
      });
    });
  });

  describe('selectors', () => {
    it('isAvailable gives true if the secureStore reducer is in "Available" state', () => {
      const stateNameMap: Record<SecureStoreSliceState['status'], string> = {
        Initialising: '',
        Available: '',
        NotAvailable: '',
      };
      for (const status of Object.keys(stateNameMap)) {
        expect(
          secureStoreSelectors.secureStore.isAvailable({
            secureStore: {
              status: status as SecureStoreSliceState['status'],
            },
          }),
        ).toEqual(status === 'Available');
      }
    });
  });
});
