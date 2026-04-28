import { beforeEach, describe, expect, it, vi } from 'vitest';

import { clipboardService } from '../src/clipboard-service';

describe('clipboardService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkPermissions', () => {
    it('should check clipboard permissions', async () => {
      navigator.permissions.query = vi.fn().mockResolvedValue({
        state: 'granted',
      });
      const permissions = await clipboardService.checkPermissions();

      expect(permissions).toEqual({ read: true, write: true });
      expect(navigator.permissions.query).toHaveBeenCalledTimes(2);
      expect(navigator.permissions.query).toHaveBeenCalledWith({
        name: 'clipboard-read',
      });
      expect(navigator.permissions.query).toHaveBeenCalledWith({
        name: 'clipboard-write',
      });
    });

    it('should return false if permissions are not granted', async () => {
      navigator.permissions.query = vi.fn().mockResolvedValue({
        state: 'denied',
      });
      const permissions = await clipboardService.checkPermissions();

      expect(permissions).toEqual({ read: false, write: false });
      expect(navigator.permissions.query).toHaveBeenCalledTimes(2);
      expect(navigator.permissions.query).toHaveBeenCalledWith({
        name: 'clipboard-read',
      });
      expect(navigator.permissions.query).toHaveBeenCalledWith({
        name: 'clipboard-write',
      });
    });

    it('should return false if permissions are not available', async () => {
      navigator.permissions.query = vi
        .fn()
        .mockRejectedValue(new Error('Error'));
      const permissions = await clipboardService.checkPermissions();

      expect(permissions).toEqual({ read: false, write: false });
    });
  });

  describe('read', () => {
    it('should read text from the clipboard if permissions granted', async () => {
      const text = await clipboardService.read();
      expect(text).toBe('mock clipboard text');
      expect(navigator.clipboard.readText).toHaveBeenCalled();
    });
  });

  describe('write', () => {
    it('should write text to the clipboard', async () => {
      await clipboardService.write('mock clipboard text');
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        'mock clipboard text',
      );
    });
  });

  describe('erase', () => {
    it('should erase text from the clipboard', async () => {
      await clipboardService.erase();
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('');
    });
  });
});
