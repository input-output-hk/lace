import { WalletId } from '@lace-contract/wallet-repo';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { navigationRef } from '../src/core';
import { NavigationControls } from '../src/core/navigation-controls';
import { SheetControls } from '../src/core/sheet-controls';
import { StackRoutes, SheetRoutes, TabRoutes } from '../src/types/routes';

vi.mock('react-native', () => ({
  Platform: { OS: 'web' },
  Keyboard: { dismiss: vi.fn() },
}));

vi.mock('../src/core/sheet-controls', () => ({
  SheetControls: {
    getCurrentRoute: vi.fn(),
    expand: vi.fn(),
    close: vi.fn(),
    isOpen: vi.fn(),
    navigate: vi.fn(),
  },
}));

vi.mock('../src/core', () => ({
  navigationRef: {
    isReady: vi.fn(),
    navigate: vi.fn(),
    getCurrentRoute: vi.fn(),
  },
}));

describe('NavigationControls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('actions.closeAndNavigate', () => {
    it('should close sheet and navigate when navigation is ready', () => {
      const mockNavigate = vi.mocked(navigationRef.navigate);
      const mockIsReady = vi.mocked(navigationRef.isReady);
      const mockClose = vi.mocked(SheetControls.close);

      mockIsReady.mockReturnValue(true);

      NavigationControls.actions.closeAndNavigate(StackRoutes.Home, {
        screen: TabRoutes.AccountCenter,
      });

      expect(mockClose).toHaveBeenCalledOnce();
      expect(mockIsReady).toHaveBeenCalledOnce();
      expect(mockNavigate).toHaveBeenCalledWith({
        name: StackRoutes.Home,
        params: {
          screen: TabRoutes.AccountCenter,
        },
      });
      expect(mockClose).toHaveBeenCalledBefore(mockNavigate);
    });

    it('should close sheet and navigate with params when navigation is ready', () => {
      const mockNavigate = vi.mocked(navigationRef.navigate);
      const mockIsReady = vi.mocked(navigationRef.isReady);
      const mockClose = vi.mocked(SheetControls.close);

      mockIsReady.mockReturnValue(true);

      const params = { walletId: 'test-wallet', accountId: 'test-account' };

      NavigationControls.actions.closeAndNavigate(
        StackRoutes.AccountDetails,
        params,
      );

      expect(mockClose).toHaveBeenCalledOnce();
      expect(mockIsReady).toHaveBeenCalledOnce();
      expect(mockNavigate).toHaveBeenCalledWith({
        name: StackRoutes.AccountDetails,
        params: params,
      });
      expect(mockClose).toHaveBeenCalledBefore(mockNavigate);
    });

    it('should close sheet but not navigate when navigation is not ready', () => {
      const mockNavigate = vi.mocked(navigationRef.navigate);
      const mockIsReady = vi.mocked(navigationRef.isReady);
      const mockClose = vi.mocked(SheetControls.close);

      mockIsReady.mockReturnValue(false);

      NavigationControls.actions.closeAndNavigate(StackRoutes.Home, {
        screen: TabRoutes.AccountCenter,
      });

      expect(mockClose).toHaveBeenCalledOnce();
      expect(mockIsReady).toHaveBeenCalledOnce();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should handle undefined navigationRef gracefully', () => {
      const mockNavigate = vi.mocked(navigationRef.navigate);
      const mockIsReady = vi.mocked(navigationRef.isReady);
      const mockClose = vi.mocked(SheetControls.close);

      mockIsReady.mockReturnValue(false);

      NavigationControls.actions.closeAndNavigate(StackRoutes.WalletSettings, {
        walletId: WalletId('test'),
      });

      expect(mockClose).toHaveBeenCalledOnce();
      expect(mockIsReady).toHaveBeenCalledOnce();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('sheets.close', () => {
    it('should call SheetControls.close', () => {
      const mockClose = vi.mocked(SheetControls.close);

      NavigationControls.sheets.close();

      expect(mockClose).toHaveBeenCalledOnce();
      expect(mockClose).toHaveBeenCalledWith();
    });
  });

  describe('sheets.isOpen', () => {
    it('should call SheetControls.isOpen and return result', () => {
      const mockIsOpen = vi.mocked(SheetControls.isOpen);
      mockIsOpen.mockReturnValue(true);

      const isSheetOpen = NavigationControls.sheets.isOpen();

      expect(mockIsOpen).toHaveBeenCalledOnce();
      expect(mockIsOpen).toHaveBeenCalledWith();
      expect(isSheetOpen).toBe(true);
    });

    it('should return false when sheet is closed', () => {
      const mockIsOpen = vi.mocked(SheetControls.isOpen);
      mockIsOpen.mockReturnValue(false);

      const isSheetOpen = NavigationControls.sheets.isOpen();

      expect(mockIsOpen).toHaveBeenCalledOnce();
      expect(isSheetOpen).toBe(false);
    });
  });

  describe('sheets.navigate', () => {
    it('should call SheetControls.navigate with route only', () => {
      const mockNavigate = vi.mocked(SheetControls.navigate);

      NavigationControls.sheets.navigate(SheetRoutes.Initial);

      expect(mockNavigate).toHaveBeenCalledOnce();
      expect(mockNavigate).toHaveBeenCalledWith(SheetRoutes.Initial);
    });

    it('should call SheetControls.navigate with route and params', () => {
      const mockNavigate = vi.mocked(SheetControls.navigate);
      const params = { walletId: 'test-wallet', accountId: 'test-account' };

      NavigationControls.sheets.navigate(SheetRoutes.RemoveAccount, params);

      expect(mockNavigate).toHaveBeenCalledOnce();
      expect(mockNavigate).toHaveBeenCalledWith(
        SheetRoutes.RemoveAccount,
        params,
      );
    });

    it('should call SheetControls.navigate with route, params and options', () => {
      const mockNavigate = vi.mocked(SheetControls.navigate);
      const params = { walletId: 'test-wallet', accountId: 'test-account' };
      const options = { merge: true, pop: false };

      NavigationControls.sheets.navigate(
        SheetRoutes.RemoveAccount,
        params,
        options,
      );

      expect(mockNavigate).toHaveBeenCalledOnce();
      expect(mockNavigate).toHaveBeenCalledWith(
        SheetRoutes.RemoveAccount,
        params,
        options,
      );
    });

    it('should call SheetControls.navigate for routes without params', () => {
      const mockNavigate = vi.mocked(SheetControls.navigate);

      NavigationControls.sheets.navigate(SheetRoutes.RemoveAccountSuccess);

      expect(mockNavigate).toHaveBeenCalledOnce();
      expect(mockNavigate).toHaveBeenCalledWith(
        SheetRoutes.RemoveAccountSuccess,
      );
    });
  });
});
