import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { useIsInStakingTab } from '../../src/hooks/isInStakingTab';

type StateChangeCallback = () => void;

type MockNavigationRefCurrent = {
  addListener: ReturnType<typeof vi.fn>;
  removeListener: ReturnType<typeof vi.fn>;
  getCurrentRoute: ReturnType<typeof vi.fn>;
  stateChangeCallback: StateChangeCallback | undefined;
  triggerStateChange: () => void;
};

const { mockNavigationRef, makeCurrent } = vi.hoisted(() => {
  const make = (): MockNavigationRefCurrent => ({
    addListener: vi.fn(),
    removeListener: vi.fn(),
    getCurrentRoute: vi.fn().mockReturnValue(undefined),
    stateChangeCallback: undefined,
    triggerStateChange() {
      this.stateChangeCallback?.();
    },
  });

  const ref: { current: MockNavigationRefCurrent | null } = {
    current: make(),
  };

  return { mockNavigationRef: ref, makeCurrent: make };
});

vi.mock('@lace-lib/navigation', () => ({
  navigationRef: mockNavigationRef,
  TabRoutes: { StakingCenter: 'StakingCenter' },
}));

const wireStateListener = (current: MockNavigationRefCurrent) => {
  current.addListener.mockImplementation(
    (_event: 'state', callback: StateChangeCallback) => {
      current.stateChangeCallback = callback;
    },
  );
};

describe('useIsInStakingTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const current = makeCurrent();
    wireStateListener(current);
    mockNavigationRef.current = current;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return false initially', () => {
    const { result } = renderHook(() => useIsInStakingTab());
    expect(result.current).toBe(false);
  });

  it('should return true when on StakingCenter tab', () => {
    const { result } = renderHook(() => useIsInStakingTab());

    act(() => {
      mockNavigationRef.current!.getCurrentRoute.mockReturnValue({
        name: 'StakingCenter',
      });
      mockNavigationRef.current!.triggerStateChange();
    });

    expect(result.current).toBe(true);
  });

  it('should return false when on a different tab', () => {
    const { result } = renderHook(() => useIsInStakingTab());

    act(() => {
      mockNavigationRef.current!.getCurrentRoute.mockReturnValue({
        name: 'Portfolio',
      });
      mockNavigationRef.current!.triggerStateChange();
    });

    expect(result.current).toBe(false);
  });

  it('should flip back to false after leaving StakingCenter', () => {
    const { result } = renderHook(() => useIsInStakingTab());

    act(() => {
      mockNavigationRef.current!.getCurrentRoute.mockReturnValue({
        name: 'StakingCenter',
      });
      mockNavigationRef.current!.triggerStateChange();
    });
    expect(result.current).toBe(true);

    act(() => {
      mockNavigationRef.current!.getCurrentRoute.mockReturnValue({
        name: 'Accounts',
      });
      mockNavigationRef.current!.triggerStateChange();
    });
    expect(result.current).toBe(false);
  });

  it('should return true immediately when already on StakingCenter at mount', () => {
    mockNavigationRef.current!.getCurrentRoute.mockReturnValue({
      name: 'StakingCenter',
    });

    const { result } = renderHook(() => useIsInStakingTab());

    expect(result.current).toBe(true);
  });

  it('should remove listener on unmount', () => {
    const { unmount } = renderHook(() => useIsInStakingTab());
    const current = mockNavigationRef.current!;

    unmount();

    expect(current.removeListener).toHaveBeenCalledWith(
      'state',
      expect.any(Function),
    );
  });

  describe('Android: navigationRef.current is null at mount', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    it('should set up listener once navigationRef becomes available', () => {
      mockNavigationRef.current = null;
      const { result } = renderHook(() => useIsInStakingTab());

      expect(result.current).toBe(false);

      const current = makeCurrent();
      wireStateListener(current);
      mockNavigationRef.current = current;

      act(() => {
        vi.advanceTimersByTime(50);
      });

      expect(current.addListener).toHaveBeenCalledWith(
        'state',
        expect.any(Function),
      );
    });

    it('should detect StakingCenter tab after navigationRef becomes available', () => {
      mockNavigationRef.current = null;
      const { result } = renderHook(() => useIsInStakingTab());

      const current = makeCurrent();
      current.getCurrentRoute.mockReturnValue({ name: 'StakingCenter' });
      wireStateListener(current);
      mockNavigationRef.current = current;

      act(() => {
        vi.advanceTimersByTime(50);
      });

      expect(result.current).toBe(true);
    });

    it('should clear the poll interval and remove listener on unmount before ref is available', () => {
      mockNavigationRef.current = null;
      const { unmount } = renderHook(() => useIsInStakingTab());

      expect(() => {
        unmount();
        vi.advanceTimersByTime(200);
      }).not.toThrow();
    });
  });
});
