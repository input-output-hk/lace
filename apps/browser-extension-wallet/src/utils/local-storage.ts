import isNil from 'lodash/isNil';
import { ILocalStorage } from '../types';

export type LocalStorageChangeEventPayload<T = ILocalStorage, K extends keyof T = keyof T> = {
  key: K;
  value: T[K];
};

export type StorageEventType = 'change' | 'delete' | 'create' | 'any';
export type StorageEventPresetAction = 'reload';

export const getValueFromLocalStorage = <T = ILocalStorage, K extends keyof T = keyof T>(
  key: K,
  defaultValue?: T[K],
  reviver?: (key: string, value: unknown) => unknown
): T[K] => {
  const item = window.localStorage.getItem(key as string);
  return item ? JSON.parse(item, reviver) : defaultValue;
};

export const saveValueInLocalStorage = <T = ILocalStorage, K extends keyof T = keyof T>({
  key,
  value,
  replacer,
  eventName
}: {
  key: K;
  value: T[K];
  replacer?: (key: string, value: unknown) => unknown;
  eventName?: string;
}): void => {
  const valueToStore = JSON.stringify(value, replacer);

  if (eventName) {
    const event = new CustomEvent<LocalStorageChangeEventPayload<T, K>>(eventName, { detail: { key, value } });
    window.dispatchEvent(event);
  }
  window.localStorage.setItem(key as string, valueToStore);
};

export const deleteFromLocalStorage = (key: keyof ILocalStorage): void => window.localStorage.removeItem(key);

type ClearLocalStorageOptions = { except: (keyof ILocalStorage)[] };
export const clearLocalStorage = (params?: ClearLocalStorageOptions): void => {
  const except = params?.except || [];
  Object.keys(window.localStorage).forEach((key) => {
    if (!except.includes(key as keyof ILocalStorage)) {
      window.localStorage.removeItem(key);
    }
  });
};

export const onStorageChangeEvent = (
  keys: (keyof ILocalStorage)[] | 'all',
  callback: StorageEventPresetAction | ((ev?: StorageEvent) => unknown),
  eventType: StorageEventType = 'any'
): (() => void) => {
  // eslint-disable-next-line complexity, consistent-return
  const listener = (ev: StorageEvent) => {
    let extraCondition = true;

    switch (eventType) {
      case 'create':
        extraCondition = isNil(ev.oldValue) && !isNil(ev.newValue);
        break;
      case 'delete':
        extraCondition = !isNil(ev.oldValue) && isNil(ev.newValue);
        break;
      case 'change':
        extraCondition = !isNil(ev.oldValue) && !isNil(ev.newValue);
        break;
      case 'any':
      default:
        extraCondition = true;
    }

    const shouldRun = typeof keys === 'string' ? keys === 'all' : keys.includes(ev.key as keyof ILocalStorage);
    if (shouldRun && extraCondition) {
      if (typeof callback === 'string' && (callback as StorageEventPresetAction) === 'reload') {
        return window.location.reload();
      }
      if (typeof callback === 'function') return callback(ev);
    }
  };
  window.addEventListener('storage', listener);

  return () => window.removeEventListener('storage', listener);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types
export const bufferReviver = (_: string, value: any): Buffer | any => {
  // Buffers are saved stringified as { type: "Buffer", data: [...] } in local storage
  if (
    value !== null &&
    typeof value === 'object' &&
    'type' in value &&
    value.type === 'Buffer' &&
    'data' in value &&
    Array.isArray(value.data)
  ) {
    return Buffer.from(value.data);
  }
  return value;
};
