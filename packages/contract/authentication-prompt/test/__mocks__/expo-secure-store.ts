/**
 * Mock for expo-secure-store used in tests.
 * This avoids loading the actual native module which requires expo runtime.
 */

export const AFTER_FIRST_UNLOCK = 'AFTER_FIRST_UNLOCK';
export const AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY =
  'AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY';
export const ALWAYS = 'ALWAYS';
export const ALWAYS_THIS_DEVICE_ONLY = 'ALWAYS_THIS_DEVICE_ONLY';
export const WHEN_PASSCODE_SET_THIS_DEVICE_ONLY =
  'WHEN_PASSCODE_SET_THIS_DEVICE_ONLY';
export const WHEN_UNLOCKED = 'WHEN_UNLOCKED';
export const WHEN_UNLOCKED_THIS_DEVICE_ONLY = 'WHEN_UNLOCKED_THIS_DEVICE_ONLY';

export const getItemAsync = async (
  _key: string,
  _options?: { requireAuthentication?: boolean },
): Promise<string | null> => {
  return null;
};

export const setItemAsync = async (
  _key: string,
  _value: string,
  _options?: { requireAuthentication?: boolean },
): Promise<void> => {
  // noop
};

export const deleteItemAsync = async (_key: string): Promise<void> => {
  // noop
};

export const isAvailableAsync = async (): Promise<boolean> => {
  return true;
};

export const canUseBiometricAuthentication = (): boolean => {
  return false;
};

// Synchronous versions
export const getItem = (
  _key: string,
  _options?: { requireAuthentication?: boolean },
): string | null => {
  return null;
};

export const setItem = (
  _key: string,
  _value: string,
  _options?: { requireAuthentication?: boolean },
): void => {
  // noop
};

export const deleteItem = (_key: string): void => {
  // noop
};

export const getValueWithKeySync = (_key: string): string | null => {
  return null;
};

export const setValueWithKeySync = (_key: string, _value: string): void => {
  // noop
};

export default {
  getItemAsync,
  setItemAsync,
  deleteItemAsync,
  isAvailableAsync,
  canUseBiometricAuthentication,
  getItem,
  setItem,
  deleteItem,
  getValueWithKeySync,
  setValueWithKeySync,
};
