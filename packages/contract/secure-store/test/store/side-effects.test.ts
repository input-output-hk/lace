/* eslint-disable @typescript-eslint/no-unsafe-assignment,@typescript-eslint/naming-convention */

import { testSideEffect } from '@lace-lib/util-dev';
import { firstValueFrom, Observable } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { secureStoreActions as actions } from '../../src/store';
import {
  makeCheckSecureStoreAvailability,
  makeIsSecureStoreAvailable,
} from '../../src/store/side-effects';

import type { SecureStore } from '../../src/types';

describe('secure-store side effects', () => {
  describe('makeIsSecureStoreAvailable', () => {
    it('calls isAvailableAsync of provided secureStore', () => {
      const value = true;
      const mockedSecureStore = {
        isAvailableAsync: vi.fn().mockResolvedValue(value),
      } as unknown as SecureStore;
      const isSecureStoreAvailable =
        makeIsSecureStoreAvailable(mockedSecureStore);
      isSecureStoreAvailable();

      expect(mockedSecureStore.isAvailableAsync).toHaveBeenCalledTimes(1);
    });

    it('converts the result to an observable', async () => {
      const value = true;
      const mockedSecureStore = {
        isAvailableAsync: vi.fn().mockResolvedValue(value),
      } as unknown as SecureStore;
      const isSecureStoreAvailable =
        makeIsSecureStoreAvailable(mockedSecureStore);

      const result = isSecureStoreAvailable();
      expect(result).toEqual(expect.any(Observable));
      expect(await firstValueFrom(result)).toBe(value);
    });
  });

  describe('makeCheckSecureStoreAvailability', () => {
    it('checks Secure Store availability', () => {
      const isSecureStoreAvailableMock = vi.fn();
      testSideEffect(
        {
          build: ({ cold }) => {
            isSecureStoreAvailableMock.mockReturnValue(cold('a', { a: true }));
            return makeCheckSecureStoreAvailability(isSecureStoreAvailableMock);
          },
        },
        ({ cold, expectObservable, flush }) => {
          return {
            stateObservables: {
              secureStore: {
                selectSecureStoreState$: cold('aa', {
                  a: {
                    status: 'Initialising' as const,
                  },
                }),
              },
            },
            dependencies: {
              actions,
            },
            assertion: sideEffect$ => {
              expectObservable(sideEffect$).toBe('a', {
                a: expect.any(Object),
              });
              flush();

              expect(isSecureStoreAvailableMock).toHaveBeenCalledTimes(1);
            },
          };
        },
      );
    });

    it('sends availabilityChecked action with result', () => {
      const result = true;
      const isSecureStoreAvailableMock = vi.fn();
      testSideEffect(
        {
          build: ({ cold }) => {
            isSecureStoreAvailableMock.mockReturnValue(
              cold('a', { a: result }),
            );
            return makeCheckSecureStoreAvailability(isSecureStoreAvailableMock);
          },
        },
        ({ cold, expectObservable }) => {
          return {
            stateObservables: {
              secureStore: {
                selectSecureStoreState$: cold('aa', {
                  a: {
                    status: 'Initialising' as const,
                  },
                }),
              },
            },
            dependencies: {
              actions,
            },
            assertion: sideEffect$ => {
              expectObservable(sideEffect$).toBe('a', {
                a: actions.secureStore.availabilityChecked({
                  available: result,
                }),
              });
            },
          };
        },
      );
    });
  });
});
