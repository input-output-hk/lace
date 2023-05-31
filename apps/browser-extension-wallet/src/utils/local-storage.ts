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

export const onStorageChangeEvent = (
  keys: (keyof ILocalStorage)[],
  callback: StorageEventPresetAction | (() => unknown),
  eventType: StorageEventType = 'any'
): void => {
  // eslint-disable-next-line consistent-return, complexity
  window.addEventListener('storage', (ev) => {
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
        true;
    }

    if (keys.includes(ev.key as keyof ILocalStorage) && extraCondition) {
      if (typeof callback === 'string' && (callback as StorageEventPresetAction) === 'reload')
        return window.location.reload();

      if (typeof callback === 'function') return callback();
    }
  });
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
