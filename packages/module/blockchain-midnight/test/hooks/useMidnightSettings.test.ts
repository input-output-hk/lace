/**
 * @vitest-environment jsdom
 */
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useMidnightSettings } from '../../src/hooks/useMidnightSettings';

import type { MidnightSettingsDrawerState } from '../../src/store/slice';

// Mock the hooks module
const mockUseLaceSelector = vi.fn();
const mockUseDispatchLaceAction = vi.fn();

vi.mock('../../src/hooks/lace-context', () => ({
  useLaceSelector: (selector: string): unknown => mockUseLaceSelector(selector),
  useDispatchLaceAction: (action: string, ...args: unknown[]): unknown =>
    mockUseDispatchLaceAction(action, ...args),
}));

// Mock createProveServerOptions
vi.mock('../../src/extension/components/forms/ConfigureMidnightForm', () => ({
  createProveServerOptions: vi.fn(
    ({
      localProofServerAddress,
      remoteProofServerAddress,
    }: {
      localProofServerAddress: string;
      remoteProofServerAddress?: string;
    }) => {
      const options = [{ url: localProofServerAddress, variant: 'local' }];
      if (remoteProofServerAddress) {
        options.unshift({
          url: remoteProofServerAddress,
          variant: 'remote',
        });
      }
      return options;
    },
  ),
}));

describe('useMidnightSettings', () => {
  const mockNetworkId = 'preprod';
  const mockNetworksConfig = {
    preprod: {
      proofServerAddress: 'http://localhost:6300',
      nodeAddress: 'http://localhost:9000',
      indexerAddress: 'http://localhost:8000',
    },
  };
  const mockDefaultNetworksConfig = {
    preprod: {
      proofServerAddress: 'http://localhost:6300',
    },
  };
  const mockFeatureFlagsOverrides = {
    preprod: {
      proofServerAddress: 'https://remote.prover.com',
    },
  };
  const mockSupportedNetworkIds = ['preprod'] as const;
  const mockOpenSettings = vi.fn();
  const mockCloseSettings = vi.fn();
  const mockConfirmSettings = vi.fn();

  const setupMocks = (
    settingsDrawerState: MidnightSettingsDrawerState = { status: 'Closed' },
    featureFlagsOverrides = mockFeatureFlagsOverrides,
  ) => {
    mockUseLaceSelector.mockImplementation((selector: string) => {
      switch (selector) {
        case 'midnightContext.selectNetworkId':
          return mockNetworkId;
        case 'midnightContext.selectNetworksConfig':
          return mockNetworksConfig;
        case 'midnightContext.selectNetworksDefaultConfig':
          return mockDefaultNetworksConfig;
        case 'midnightContext.selectNetworksConfigFeatureFlagsOverrides':
          return featureFlagsOverrides;
        case 'midnightContext.selectSupportedNetworksIds':
          return mockSupportedNetworkIds;
        case 'midnight.selectSettingsDrawerState':
          return settingsDrawerState;
        default:
          return undefined;
      }
    });

    mockUseDispatchLaceAction.mockImplementation(
      (action: string, _bindArgs?: boolean) => {
        switch (action) {
          case 'midnight.openSettings':
            return mockOpenSettings;
          case 'midnight.closeSettings':
            return mockCloseSettings;
          case 'midnight.confirmSettings':
            return mockConfirmSettings;
          default:
            return vi.fn();
        }
      },
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('selector calls', () => {
    it('calls all required selectors', () => {
      setupMocks();
      renderHook(() => useMidnightSettings());

      expect(mockUseLaceSelector).toHaveBeenCalledWith(
        'midnightContext.selectNetworkId',
      );
      expect(mockUseLaceSelector).toHaveBeenCalledWith(
        'midnightContext.selectNetworksConfig',
      );
      expect(mockUseLaceSelector).toHaveBeenCalledWith(
        'midnightContext.selectNetworksDefaultConfig',
      );
      expect(mockUseLaceSelector).toHaveBeenCalledWith(
        'midnightContext.selectNetworksConfigFeatureFlagsOverrides',
      );
      expect(mockUseLaceSelector).toHaveBeenCalledWith(
        'midnightContext.selectSupportedNetworksIds',
      );
      expect(mockUseLaceSelector).toHaveBeenCalledWith(
        'midnight.selectSettingsDrawerState',
      );
    });
  });

  describe('isOpen derived state', () => {
    it('returns false when status is Closed', () => {
      setupMocks({ status: 'Closed' });
      const { result } = renderHook(() => useMidnightSettings());

      expect(result.current.isOpen).toBe(false);
    });

    it('returns true when status is Open', () => {
      setupMocks({ status: 'Open' });
      const { result } = renderHook(() => useMidnightSettings());

      expect(result.current.isOpen).toBe(true);
    });

    it('returns true when status is Saving', () => {
      setupMocks({
        status: 'Saving',
        config: mockNetworksConfig.preprod,
        networkId: 'preprod',
      });
      const { result } = renderHook(() => useMidnightSettings());

      expect(result.current.isOpen).toBe(true);
    });
  });

  describe('isSaving derived state', () => {
    it('returns false when status is Closed', () => {
      setupMocks({ status: 'Closed' });
      const { result } = renderHook(() => useMidnightSettings());

      expect(result.current.isSaving).toBe(false);
    });

    it('returns false when status is Open', () => {
      setupMocks({ status: 'Open' });
      const { result } = renderHook(() => useMidnightSettings());

      expect(result.current.isSaving).toBe(false);
    });

    it('returns true when status is Saving', () => {
      setupMocks({
        status: 'Saving',
        config: mockNetworksConfig.preprod,
        networkId: 'preprod',
      });
      const { result } = renderHook(() => useMidnightSettings());

      expect(result.current.isSaving).toBe(true);
    });
  });

  describe('getProveServerOptions', () => {
    it('returns both options when remote address exists', () => {
      setupMocks();
      const { result } = renderHook(() => useMidnightSettings());

      const options = result.current.getProveServerOptions('preprod');

      expect(options).toHaveLength(2);
      expect(options[0]).toEqual({
        url: 'https://remote.prover.com',
        variant: 'remote',
      });
      expect(options[1]).toEqual({
        url: 'http://localhost:6300',
        variant: 'local',
      });
    });

    it('returns only local option when remote address is undefined', () => {
      const noRemoteOverrides = {
        preprod: { proofServerAddress: undefined as unknown as string },
      };
      setupMocks({ status: 'Closed' }, noRemoteOverrides);
      const { result } = renderHook(() => useMidnightSettings());

      const options = result.current.getProveServerOptions('preprod');

      expect(options).toHaveLength(1);
      expect(options[0]).toEqual({
        url: 'http://localhost:6300',
        variant: 'local',
      });
    });
  });

  describe('actions exposed', () => {
    it('returns openSettings action', () => {
      setupMocks();
      const { result } = renderHook(() => useMidnightSettings());

      expect(result.current.openSettings).toBe(mockOpenSettings);
    });

    it('returns closeSettings action', () => {
      setupMocks();
      const { result } = renderHook(() => useMidnightSettings());

      expect(result.current.closeSettings).toBe(mockCloseSettings);
    });

    it('returns save (confirmSettings) action', () => {
      setupMocks();
      const { result } = renderHook(() => useMidnightSettings());

      expect(result.current.save).toBe(mockConfirmSettings);
    });
  });

  describe('state values', () => {
    it('returns networkId', () => {
      setupMocks();
      const { result } = renderHook(() => useMidnightSettings());

      expect(result.current.networkId).toBe(mockNetworkId);
    });

    it('returns networksConfig', () => {
      setupMocks();
      const { result } = renderHook(() => useMidnightSettings());

      expect(result.current.networksConfig).toBe(mockNetworksConfig);
    });

    it('returns supportedNetworkIds', () => {
      setupMocks();
      const { result } = renderHook(() => useMidnightSettings());

      expect(result.current.supportedNetworkIds).toBe(mockSupportedNetworkIds);
    });
  });
});
