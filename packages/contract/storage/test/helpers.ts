import { from, throwError } from 'rxjs';
import { vi } from 'vitest';

/**
 * Mock for react-native AsyncStorage API interface we are using:
 * https://react-native-async-storage.github.io/async-storage/docs/api
 */
export const mockStorageApi = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
};

/**
 * We are using observables instead of a promises to test the interaction
 * with the async storage because marble testing does not support promises
 * https://github.com/cartant/rxjs-marbles/issues/11
 */
export const mockEmptyStorage = () =>
  mockStorageApi.getItem.mockReturnValue(from([null]));

export const mockStoredData = (data: unknown) =>
  mockStorageApi.getItem.mockReturnValue(from([data]));

export const mockStoredDataOnce = (data: unknown) =>
  mockStorageApi.getItem.mockReturnValueOnce(from([data]));

export const mockSuccessfulStorage = () =>
  mockStorageApi.setItem.mockReturnValue(from([undefined]));

export const MOCK_STORAGE_SAVE_ERROR = new Error('mock storage failed');

export const mockFailedStorage = () =>
  mockStorageApi.setItem.mockReturnValue(
    throwError(() => MOCK_STORAGE_SAVE_ERROR),
  );
