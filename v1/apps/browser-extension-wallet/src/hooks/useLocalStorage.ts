import { useState, useCallback, useEffect } from 'react';
import isEqual from 'lodash/isEqual';
import { ILocalStorage } from '../types';
import {
  getValueFromLocalStorage,
  saveValueInLocalStorage,
  LocalStorageChangeEventPayload
} from '../utils/local-storage';

interface UseLocalStorageHelpers<T> {
  updateLocalStorage: (value: T) => void;
}
type UseLocalStorageResponse<T> = [T, UseLocalStorageHelpers<T>];

export const useLocalStorage = <T = ILocalStorage, K extends keyof T = keyof T>(
  key: K,
  defaultValue?: T[K]
): UseLocalStorageResponse<T[K]> => {
  const defaultStoredField = getValueFromLocalStorage<T, K>(key, defaultValue);
  const [storedField, setStoredField] = useState<T[K]>(defaultStoredField);
  const eventName = `change_${String(key)}`;

  const updateIfDifferent = useCallback(
    (nextValue) => {
      if (isEqual(storedField, nextValue)) return;
      setStoredField(nextValue);
    },
    [storedField]
  );

  const onLocalStorageKeyChange = useCallback(
    ({ detail: { value } }: CustomEvent<LocalStorageChangeEventPayload<T>>) => {
      updateIfDifferent(value);
    },
    [updateIfDifferent]
  );

  useEffect(() => {
    const value = getValueFromLocalStorage<T, K>(key, defaultValue);
    updateIfDifferent(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    window.addEventListener(eventName, onLocalStorageKeyChange, false);
    return () => {
      window.removeEventListener(eventName, onLocalStorageKeyChange);
    };
  }, [onLocalStorageKeyChange, eventName]);

  const updateLocalStorage = useCallback(
    (value: T[K]): void => {
      saveValueInLocalStorage<T, K>({ key, value, eventName });
    },
    [key, eventName]
  );
  return [storedField, { updateLocalStorage }];
};
