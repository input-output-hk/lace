import {
  MissingContractImplementationError,
  ModuleName,
} from '@lace-contract/module';
import { describe, expect, it, vi } from 'vitest';

import {
  featureFlagsToFeatures,
  filterModules,
  selectModulesWithFallback,
} from '../src';
import { FeatureFlagKey } from '../src';

import { developmentEnvironment } from './util';

import type { FeatureFlag } from '../src/types';
import type { LaceModule } from '@lace-contract/module';

const mockCaptureException = vi.fn();
vi.mock('@lace-lib/observability', () => ({
  getObservability: () => ({
    captureException: mockCaptureException,
    captureMessage: vi.fn(),
    addBreadcrumb: vi.fn(),
    setUser: vi.fn(),
    setTag: vi.fn(),
    setContext: vi.fn(),
    withScope: vi.fn(),
  }),
}));

const featureFlags: FeatureFlag[] = [{ key: FeatureFlagKey('flag1') }];
const mockModules = [
  {
    moduleName: ModuleName('Module1'),
    feature: {
      metadata: 'Metadata1',
      willLoad: vi.fn((featureFlags: readonly FeatureFlag[]) =>
        featureFlags.some((f: FeatureFlag) => f.key === 'flag1'),
      ),
    },
  } as unknown as LaceModule,
  {
    moduleName: ModuleName('Module2'),
    feature: {
      metadata: 'Metadata2',
      willLoad: vi.fn((featureFlags: readonly FeatureFlag[]) =>
        featureFlags.some((f: FeatureFlag) => f.key === 'flag2'),
      ),
    },
  } as unknown as LaceModule,
  {
    moduleName: ModuleName('Module3'),
    feature: undefined,
  } as unknown as LaceModule,
];

describe('util', () => {
  describe('filterModules', () => {
    it('should only include modules where willLoad returns true, or "feature" is undefined', () => {
      const filteredModules = filterModules(
        mockModules,
        featureFlags,
        developmentEnvironment,
      );
      expect(filteredModules).toHaveLength(2);
      expect(filteredModules[0].moduleName).toEqual('Module1');
      expect(filteredModules[1].moduleName).toEqual('Module3'); // Module3 has no feature and is always loaded
      expect(mockModules[0].feature!.willLoad).toHaveBeenCalledWith(
        featureFlags,
        developmentEnvironment,
      );
    });
  });

  describe('selectModulesWithFallback', () => {
    const defaultFlags: FeatureFlag[] = [{ key: FeatureFlagKey('flag1') }];
    const contractA = {
      name: 'contractA',
      contractType: 'store',
      instance: 'exactly-one',
      dependsOn: { contracts: [] },
    };
    const compatibleModules = [
      {
        moduleName: ModuleName('AlwaysLoadModule'),
        implements: { contracts: [] },
        dependsOn: { contracts: [contractA] },
        // No feature property → always loads
      },
      {
        moduleName: ModuleName('ProviderModule'),
        implements: { contracts: [contractA] },
        dependsOn: { contracts: [] },
        feature: {
          willLoad: (flags: readonly FeatureFlag[]) =>
            flags.some(f => f.key === 'flag1'),
        },
      },
    ] as unknown as LaceModule[];

    it('returns modules with usedFallback: false when flags are compatible', () => {
      const result = selectModulesWithFallback({
        availableModules: compatibleModules,
        featureFlags: defaultFlags,
        defaultFeatureFlags: defaultFlags,
        environment: developmentEnvironment,
      });
      expect(result.usedFallback).toBe(false);
      expect(result.modulesToLoad).toHaveLength(2);
    });

    it('falls back to default flags and returns usedFallback: true on incompatible flags', () => {
      mockCaptureException.mockClear();

      const incompatibleFlags: FeatureFlag[] = [
        { key: FeatureFlagKey('nonexistent') },
      ];

      const result = selectModulesWithFallback({
        availableModules: compatibleModules,
        featureFlags: incompatibleFlags,
        defaultFeatureFlags: defaultFlags,
        environment: developmentEnvironment,
      });

      expect(result.usedFallback).toBe(true);
      expect(result.modulesToLoad).toHaveLength(2);
      expect(mockCaptureException).toHaveBeenCalledWith(
        expect.any(MissingContractImplementationError),
        expect.objectContaining({
          tags: { source: 'feature-flag-fallback' },
        }),
      );
    });
  });

  describe('featureFlagsToFeatures', () => {
    it('should transform feature flags into features with filtered modules', () => {
      const transform = featureFlagsToFeatures(mockModules);
      const features = transform(featureFlags, developmentEnvironment);

      expect(features.featureFlags).toEqual(featureFlags);
      expect(features.modules).toEqual([
        {
          moduleName: ModuleName('Module1'),
          feature: { metadata: 'Metadata1' },
        },
        {
          moduleName: ModuleName('Module3'),
          feature: undefined,
        },
      ]);
    });
  });
});
