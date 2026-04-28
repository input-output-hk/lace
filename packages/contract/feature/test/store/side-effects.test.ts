import { testSideEffect } from '@lace-lib/util-dev';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { featuresActions as actions } from '../../src';
import { FeatureFlagKey } from '../../src';
import { updateFeatures } from '../../src/store/side-effects';
import { developmentEnvironment } from '../util';

import type { FeatureFlag } from '../../src';

describe('Side Effects', () => {
  describe('updateFeatures', () => {
    // irrelevant for these tests, this is only to satisfy type requirements
    const defaultFeatureFlags: FeatureFlag[] = [];

    it('should fetch feature flags and update the store if the flags have changed', () => {
      const initialFeatureFlags = [{ key: FeatureFlagKey('initialFlag') }];
      const newFeatureFlags = [{ key: FeatureFlagKey('newFlag') }];

      const mockFeatureFlags$ = of(newFeatureFlags);

      const mockStorage = {
        set: vi.fn(of),
        get: vi.fn(() => of(initialFeatureFlags)),
      };

      const mockCreateDocumentStorage = vi.fn().mockReturnValue(mockStorage);

      const updateFeaturesEffect = updateFeatures(
        {
          availableModules: [],
          loaded: { featureFlags: initialFeatureFlags, modules: [] },
        },
        {
          env: developmentEnvironment,
          config: { extraFeatureFlags: [], defaultFeatureFlags },
        },
      );

      testSideEffect(updateFeaturesEffect, ({ flush, expectObservable }) => {
        return {
          dependencies: {
            featureFlags$: mockFeatureFlags$,
            createDocumentStorage: mockCreateDocumentStorage,
            actions,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('(a|)', {
              a: actions.features.updateFeatures({
                featureFlags: newFeatureFlags,
                modules: [],
              }),
            });

            flush();

            expect(mockCreateDocumentStorage).toHaveBeenCalled();
            expect(mockStorage.set).toHaveBeenCalledWith({
              featureFlags: newFeatureFlags,
            });
          },
        };
      });
    });

    it('should not update the store if the fetched flags are the same as loaded flags', () => {
      const initialFeatureFlags = [{ key: FeatureFlagKey('initialFlag') }];
      const mockFeatureFlags$ = of(initialFeatureFlags);

      const mockStorage = {
        set: vi.fn(of),
        get: vi.fn(() => of(initialFeatureFlags)),
      };

      const mockCreateDocumentStorage = vi.fn().mockReturnValue(mockStorage);

      const updateFeaturesEffect = updateFeatures(
        {
          availableModules: [],
          loaded: { featureFlags: initialFeatureFlags, modules: [] },
        },
        {
          env: developmentEnvironment,
          config: { extraFeatureFlags: [], defaultFeatureFlags },
        },
      );

      testSideEffect(updateFeaturesEffect, ({ flush, expectObservable }) => {
        return {
          dependencies: {
            featureFlags$: mockFeatureFlags$,
            createDocumentStorage: mockCreateDocumentStorage,
            actions,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('|');

            flush();

            expect(mockCreateDocumentStorage).toHaveBeenCalled();
            expect(mockStorage.set).not.toHaveBeenCalled();
            expect(mockStorage.get).not.toHaveBeenCalled();
          },
        };
      });
    });

    describe('extraFeatureFlags', () => {
      it('should filter out extra feature flags when checking for changes', () => {
        const extraFlag = FeatureFlagKey('extraFlag');
        const regularFlag = FeatureFlagKey('regularFlag');
        const newRegularFlag = FeatureFlagKey('newRegularFlag');

        const loadedFeatureFlags = [{ key: regularFlag }, { key: extraFlag }];
        const newFeatureFlags = [{ key: newRegularFlag }, { key: extraFlag }];

        const mockFeatureFlags$ = of(newFeatureFlags);

        const mockStorage = {
          set: vi.fn(of),
          get: vi.fn(() => of(loadedFeatureFlags)),
        };

        const mockCreateDocumentStorage = vi.fn().mockReturnValue(mockStorage);

        const updateFeaturesEffect = updateFeatures(
          {
            availableModules: [],
            loaded: { featureFlags: loadedFeatureFlags, modules: [] },
          },
          {
            env: developmentEnvironment,
            config: { extraFeatureFlags: [extraFlag], defaultFeatureFlags },
          },
        );

        testSideEffect(updateFeaturesEffect, ({ flush, expectObservable }) => {
          return {
            dependencies: {
              featureFlags$: mockFeatureFlags$,
              createDocumentStorage: mockCreateDocumentStorage,
              actions,
            },
            assertion: sideEffect$ => {
              expectObservable(sideEffect$).toBe('(a|)', {
                a: actions.features.updateFeatures({
                  featureFlags: [{ key: newRegularFlag }],
                  modules: [],
                }),
              });

              flush();

              expect(mockCreateDocumentStorage).toHaveBeenCalled();
              expect(mockStorage.set).toHaveBeenCalledWith({
                featureFlags: [{ key: newRegularFlag }],
              });
            },
          };
        });
      });

      it('should not update when only extra feature flags change', () => {
        const extraFlag1 = FeatureFlagKey('extraFlag1');
        const extraFlag2 = FeatureFlagKey('extraFlag2');
        const regularFlag = FeatureFlagKey('regularFlag');

        const loadedFeatureFlags = [{ key: regularFlag }, { key: extraFlag1 }];
        const newFeatureFlags = [{ key: regularFlag }, { key: extraFlag2 }];

        const mockFeatureFlags$ = of(newFeatureFlags);

        const mockStorage = {
          set: vi.fn(of),
          get: vi.fn(() => of(loadedFeatureFlags)),
        };

        const mockCreateDocumentStorage = vi.fn().mockReturnValue(mockStorage);

        const updateFeaturesEffect = updateFeatures(
          {
            availableModules: [],
            loaded: { featureFlags: loadedFeatureFlags, modules: [] },
          },
          {
            env: developmentEnvironment,
            config: {
              extraFeatureFlags: [extraFlag1, extraFlag2],
              defaultFeatureFlags,
            },
          },
        );

        testSideEffect(updateFeaturesEffect, ({ flush, expectObservable }) => {
          return {
            dependencies: {
              featureFlags$: mockFeatureFlags$,
              createDocumentStorage: mockCreateDocumentStorage,
              actions,
            },
            assertion: sideEffect$ => {
              expectObservable(sideEffect$).toBe('|');

              flush();

              expect(mockCreateDocumentStorage).toHaveBeenCalled();
              expect(mockStorage.set).not.toHaveBeenCalled();
            },
          };
        });
      });
    });
  });
});
