import { describe, it, expect, vi, beforeEach } from 'vitest';

import { sheetNavigationRef } from '../src/core';
import { SheetControls } from '../src/core/sheet-controls';

vi.mock('react-native', () => ({
  Platform: { OS: 'web' },
  Keyboard: { dismiss: vi.fn() },
}));

vi.mock('../src/core', () => ({
  sheetRef: { current: null },
  sheetNavigationRef: {
    isReady: vi.fn(),
    getCurrentRoute: vi.fn(),
  },
}));

vi.mock('../src/core/sheetNavigator', () => ({
  setNavigatingSheet: vi.fn(),
  isNavigatingSheet: vi.fn(() => false),
}));

describe('SheetControls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getCurrentRoute', () => {
    it('should return undefined when navigation is not ready', () => {
      const mockIsReady = vi.mocked(sheetNavigationRef.isReady);
      mockIsReady.mockReturnValue(false);

      const result = SheetControls.getCurrentRoute();

      expect(mockIsReady).toHaveBeenCalledOnce();
      expect(result).toBeUndefined();
    });

    it('should return the current route name when navigation is ready', () => {
      const mockIsReady = vi.mocked(sheetNavigationRef.isReady);
      const mockGetCurrentRoute = vi.mocked(sheetNavigationRef.getCurrentRoute);

      mockIsReady.mockReturnValue(true);
      // Use type assertion to avoid importing SheetRoutes which pulls in React Native
      mockGetCurrentRoute.mockReturnValue({
        name: 'Send',
        key: 'send-1',
        params: {},
      } as ReturnType<typeof sheetNavigationRef.getCurrentRoute>);

      const result = SheetControls.getCurrentRoute();

      expect(mockIsReady).toHaveBeenCalledOnce();
      expect(mockGetCurrentRoute).toHaveBeenCalledOnce();
      expect(result).toBe('Send');
    });

    it('should return undefined when getCurrentRoute returns undefined', () => {
      const mockIsReady = vi.mocked(sheetNavigationRef.isReady);
      const mockGetCurrentRoute = vi.mocked(sheetNavigationRef.getCurrentRoute);

      mockIsReady.mockReturnValue(true);
      mockGetCurrentRoute.mockReturnValue(undefined);

      const result = SheetControls.getCurrentRoute();

      expect(mockIsReady).toHaveBeenCalledOnce();
      expect(mockGetCurrentRoute).toHaveBeenCalledOnce();
      expect(result).toBeUndefined();
    });
  });
});
