/**
 * Mock for expo-secure-store used in tests.
 */
import { vi } from 'vitest';

export const getItemAsync = vi.fn().mockResolvedValue(null);
export const setItemAsync = vi.fn().mockResolvedValue(undefined);
export const deleteItemAsync = vi.fn().mockResolvedValue(undefined);
export const isAvailableAsync = vi.fn().mockResolvedValue(true);
export const canUseBiometricAuthentication = vi.fn().mockReturnValue(true);

export const getItem = vi.fn().mockReturnValue(null);
export const setItem = vi.fn().mockReturnValue(undefined);

export default {
  getItemAsync,
  setItemAsync,
  deleteItemAsync,
  isAvailableAsync,
  canUseBiometricAuthentication,
  getItem,
  setItem,
};
