/**
 * @vitest-environment jsdom
 */
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useMidnightSettings } from '../../src/hooks/useMidnightSettings';

import type { MidnightSettingsDrawerState } from '../../src/store/slice';
import type { ProofServerMode } from '@lace-contract/midnight-context';

// Mock the hooks module
const mockUseLaceSelector = vi.fn();
const mockUseDispatchLaceAction = vi.fn();

vi.mock('../../src/hooks/lace-context', () => ({
  useLaceSelector: (selector: string): unknown => mockUseLaceSelector(selector),
  useDispatchLaceAction: (action: string, ...args: unknown[]): unknown =>
    mockUseDispatchLaceAction(action, ...args),
}));

describe('useMidnightSettings', () => {
  const mockNetworkId = 'preprod';
  const localProofServer: ProofServerMode = {
    kind: 'local-host',
    url: 'http://localhost:6300',
  };
  const mockNetworksConfig = {
    preprod: {
      proofServer: localProofServer,
      nodeAddress: 'http://localhost:9000',
      indexerAddress: 'http://localhost:8000',
    },
  };
  const defaultAllModes: Partial<Record<string, ProofServerMode[]>> = {
    preprod: [
      localProofServer,
      {
        kind: 'delegated',
        url: 'https://remote.prover.com',
        label: 'Midnight',
      },
    ],
  };
  const mockSupportedNetworkIds = ['preprod'] as const;
  const mockOpenSettings = vi.fn();
  const mockCloseSettings = vi.fn();
  const mockConfirmSettings = vi.fn();

  const setupMocks = (
    settingsDrawerState: MidnightSettingsDrawerState = { status: 'Closed' },
    allProofServerModes: Partial<
      Record<string, ProofServerMode[]>
    > = defaultAllModes,
  ) => {
    mockUseLaceSelector.mockImplementation((selector: string) => {
      switch (selector) {
        case 'midnightContext.selectNetworkId':
          return mockNetworkId;
        case 'midnightContext.selectNetworksConfig':
          return mockNetworksConfig;
        case 'midnightContext.selectAllProofServerModes':
          return allProofServerModes;
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
        'midnightContext.selectAllProofServerModes',
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

  describe('getProofServerSections', () => {
    it('places custom servers after delegated providers', () => {
      setupMocks();
      const { result } = renderHook(() => useMidnightSettings());

      const sections = result.current.getProofServerSections('preprod');

      expect(sections).toEqual([
        {
          tier: 'delegated',
          modes: [
            {
              kind: 'delegated',
              url: 'https://remote.prover.com',
              label: 'Midnight',
            },
          ],
        },
        { tier: 'custom', modes: [localProofServer] },
      ]);
    });

    it('exposes multiple delegated providers in flag order', () => {
      setupMocks(
        { status: 'Closed' },
        {
          preprod: [
            localProofServer,
            {
              kind: 'delegated',
              url: 'https://midnight.example.com',
              label: 'Midnight Foundation',
            },
            {
              kind: 'delegated',
              url: 'https://provider.example.com',
              label: 'Example Provider',
            },
          ],
        },
      );
      const { result } = renderHook(() => useMidnightSettings());

      const sections = result.current.getProofServerSections('preprod');

      expect(sections).toEqual([
        {
          tier: 'delegated',
          modes: [
            {
              kind: 'delegated',
              url: 'https://midnight.example.com',
              label: 'Midnight Foundation',
            },
            {
              kind: 'delegated',
              url: 'https://provider.example.com',
              label: 'Example Provider',
            },
          ],
        },
        { tier: 'custom', modes: [localProofServer] },
      ]);
    });

    it('orders the delegated tier: TEE first, then delegated providers in payload order', () => {
      setupMocks(
        { status: 'Closed' },
        {
          preprod: [
            localProofServer,
            {
              kind: 'delegated',
              url: 'https://provider.example.com',
              label: 'Example Provider',
            },
            {
              kind: 'tee-delegated',
              url: 'https://api.proofserver.example.com',
              label: 'Temenos (remote TEE proof server)',
            },
            {
              kind: 'delegated',
              url: 'https://midnight.example.com',
              label: 'Midnight Foundation',
            },
          ],
        },
      );
      const { result } = renderHook(() => useMidnightSettings());

      const sections = result.current.getProofServerSections('preprod');

      expect(sections[0]?.tier).toBe('delegated');
      expect(sections[0]?.modes.map(mode => mode.kind)).toEqual([
        'tee-delegated',
        'delegated',
        'delegated',
      ]);
      expect(
        sections[0]?.modes.map(mode => ('label' in mode ? mode.label : '')),
      ).toEqual([
        'Temenos (remote TEE proof server)',
        'Example Provider',
        'Midnight Foundation',
      ]);
    });

    it('drops empty sections when no remotes are configured', () => {
      setupMocks({ status: 'Closed' }, { preprod: [localProofServer] });
      const { result } = renderHook(() => useMidnightSettings());

      const sections = result.current.getProofServerSections('preprod');

      expect(sections).toEqual([{ tier: 'custom', modes: [localProofServer] }]);
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
