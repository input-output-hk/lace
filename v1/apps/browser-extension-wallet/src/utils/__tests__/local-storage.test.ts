/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-magic-numbers */
/* eslint-disable unicorn/no-null */
import '@testing-library/jest-dom';
import {
  getValueFromLocalStorage,
  saveValueInLocalStorage,
  deleteFromLocalStorage,
  onStorageChangeEvent,
  bufferReviver,
  StorageEventType
} from '../local-storage';
import { ILocalStorage } from '@src/types';

const _listeners: { type: string; listener: EventListenerOrEventListenerObject }[] = [];

const addEventListenerOriginal = window.addEventListener;

const patchAddEventListener = () => {
  window.addEventListener = (type: any, listener: any) => {
    _listeners.push({ type, listener });
    addEventListenerOriginal.call(window, type, listener);
  };
};

const removeEventListeners = () => {
  for (const { type, listener } of _listeners) {
    window.removeEventListener(type, listener);
  }
};

describe('Testing local storage functions', () => {
  const localStorage = window.localStorage;
  const getItem = jest.fn();
  const setItem = jest.fn();
  const removeItem = jest.fn();
  beforeEach(() => {
    patchAddEventListener();
    Object.defineProperty(window, 'localStorage', {
      value: { getItem, setItem, removeItem }
    });
  });

  afterAll(() => {
    // jest.resetModules();
    Object.defineProperty(window, 'localStorage', {
      value: { ...localStorage }
    });
  });
  test('getValueFromLocalStorage', async () => {
    const key = 'key';
    const defaultValue = true;
    const reviver = jest.fn();

    const jsonParseSpy = jest.spyOn(JSON, 'parse');
    jsonParseSpy.mockReturnValueOnce('jsonParseValue');

    const item = 'value';
    getItem.mockReturnValueOnce(item);
    expect(getValueFromLocalStorage(key as keyof ILocalStorage, defaultValue, reviver)).toBe('jsonParseValue');
    expect(getItem).toBeCalledWith(key);
    expect(jsonParseSpy).toBeCalledWith(item, reviver);

    // return default value
    expect(getValueFromLocalStorage(key as keyof ILocalStorage, defaultValue, reviver)).toBe(defaultValue);
    expect(getItem).toBeCalledWith(key);
    expect(jsonParseSpy).toBeCalledTimes(1);

    jsonParseSpy.mockRestore();
  });

  test('saveValueInLocalStorage', async () => {
    const key = 'key';
    const value = true;
    const replacer = jest.fn();
    const eventName = 'eventName';

    const valueToStore = 'true';
    const jsonStringifySpy = jest.spyOn(JSON, 'stringify');
    jsonStringifySpy.mockReturnValueOnce(valueToStore);

    const dispatchEvent = jest.spyOn(window, 'dispatchEvent');

    saveValueInLocalStorage({ key: key as keyof ILocalStorage, value, replacer, eventName });
    expect(jsonStringifySpy).toBeCalledWith(value, replacer);
    expect(setItem).toBeCalledWith(key, valueToStore);
    expect(dispatchEvent).toBeCalledWith(new CustomEvent(eventName, { detail: { key, value } }));

    jsonStringifySpy.mockRestore();
    dispatchEvent.mockRestore();
  });

  test('deleteFromLocalStorage', async () => {
    const key = 'key';

    deleteFromLocalStorage(key as keyof ILocalStorage);
    expect(removeItem).toBeCalledWith(key);
  });

  test('bufferReviver', async () => {
    // should return same value
    expect(bufferReviver('key', null)).toEqual(null);
    expect(bufferReviver('key', 'string')).toEqual('string');
    expect(bufferReviver('key', {})).toEqual({});
    expect(bufferReviver('key', { type: 'Buffer' })).toEqual({ type: 'Buffer' });
    expect(bufferReviver('key', { type: 'Buffer', data: 'data' })).toEqual({ type: 'Buffer', data: 'data' });

    const bufferFromValue = 'bufferFromValue';
    const bufferFromSpy = jest.spyOn(Buffer, 'from').mockReturnValueOnce(bufferFromValue as unknown as Buffer);
    expect(bufferReviver('key', { type: 'Buffer', data: [] })).toEqual(bufferFromValue);
    expect(bufferFromSpy).toBeCalledWith([]);
    expect(bufferFromSpy).toBeCalledTimes(1);

    bufferFromSpy.mockRestore();
  });
});

describe('onStorageChangeEvent', () => {
  const location = window.location;
  const reload = jest.fn();
  const runInteractions = (cb: 'reload' | (() => unknown), eventType: StorageEventType) => {
    const key1 = 'key1';
    const key2 = 'key2';
    onStorageChangeEvent([key1, key2] as unknown as (keyof ILocalStorage)[], cb, eventType);

    window.dispatchEvent(new StorageEvent('storage', { key: key1, newValue: 'newKey1Value' }));
    window.dispatchEvent(
      new StorageEvent('storage', { key: key1, oldValue: 'oldKey1Value', newValue: 'newKey1Value' })
    );
    window.dispatchEvent(new StorageEvent('storage', { key: key1, oldValue: 'oldKey1Value' }));
    window.dispatchEvent(new StorageEvent('storage', { key: key1 }));

    window.dispatchEvent(new StorageEvent('storage', { key: key2, newValue: 'newKey1Value' }));
    window.dispatchEvent(
      new StorageEvent('storage', { key: key2, oldValue: 'oldKey1Value', newValue: 'newKey1Value' })
    );
    window.dispatchEvent(new StorageEvent('storage', { key: key2, oldValue: 'oldKey1Value' }));
    window.dispatchEvent(new StorageEvent('storage', { key: key2 }));

    window.dispatchEvent(new StorageEvent('storage', { key: 'key3', newValue: 'newKey1Value' }));
    window.dispatchEvent(
      new StorageEvent('storage', { key: 'key3', oldValue: 'oldKey1Value', newValue: 'newKey1Value' })
    );
    window.dispatchEvent(new StorageEvent('storage', { key: 'key3', oldValue: 'oldKey1Value' }));
    window.dispatchEvent(new StorageEvent('storage', { key: 'key3' }));
  };
  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      value: { reload }
    });
  });

  afterEach(() => {
    removeEventListeners();
    jest.resetModules();
    reload.mockRestore();
    Object.defineProperty(window, 'location', {
      value: { ...location }
    });
  });
  test('should register an event listener and handle "any" event type with passed cb function', async () => {
    const cb = jest.fn();
    const eventType = 'any';
    const key1 = 'key1';
    const key2 = 'key2';

    onStorageChangeEvent([key1, key2] as unknown as (keyof ILocalStorage)[], cb, eventType);
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: key1,
        newValue: 'newKey1Value'
      })
    );
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: key2,
        newValue: 'newKey1Value'
      })
    );
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: 'key3',
        newValue: 'newKey1Value'
      })
    );
    expect(cb).toBeCalledTimes(2);
    expect(reload).not.toBeCalled();
  });
  test('should register an event listener and handle "any" event type with passed "reload" string as cb value', async () => {
    const cb = 'reload';
    const eventType = 'any';
    const key1 = 'key1';
    const key2 = 'key2';

    onStorageChangeEvent([key1, key2] as unknown as (keyof ILocalStorage)[], cb, eventType);
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: key1,
        newValue: 'newKey1Value'
      })
    );
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: key2,
        newValue: 'newKey1Value'
      })
    );
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: 'key3',
        newValue: 'newKey1Value'
      })
    );
    expect(reload).toBeCalledTimes(2);
  });
  test('should register an event listener and default to "any" event type with passed cb function', async () => {
    const cb = jest.fn();
    const key1 = 'key1';
    const key2 = 'key2';

    onStorageChangeEvent([key1, key2] as unknown as (keyof ILocalStorage)[], cb);
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: key1,
        newValue: 'newKey1Value'
      })
    );
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: key2,
        newValue: 'newKey1Value'
      })
    );
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: 'key3',
        newValue: 'newKey1Value'
      })
    );
    expect(cb).toBeCalledTimes(2);
    expect(reload).not.toBeCalled();
  });
  test('should register an event listener and default to "any" event type with passed "reload" string as cb value', async () => {
    const cb = 'reload';
    const key1 = 'key1';
    const key2 = 'key2';

    onStorageChangeEvent([key1, key2] as unknown as (keyof ILocalStorage)[], cb);
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: key1,
        newValue: 'newKey1Value'
      })
    );
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: key2,
        newValue: 'newKey1Value'
      })
    );
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: 'key3',
        newValue: 'newKey1Value'
      })
    );
    expect(reload).toBeCalledTimes(2);
  });
  test('should register an event listener and handle "create" event type with passed cb function', async () => {
    const cb = jest.fn();
    const eventType = 'create';

    runInteractions(cb, eventType);

    expect(cb).toBeCalledTimes(2);
    expect(reload).not.toBeCalled();
  });
  test('should register an event listener and handle "create" event type with passed "reload" string as cb value', async () => {
    const cb = 'reload';
    const eventType = 'create';

    runInteractions(cb, eventType);

    expect(reload).toBeCalledTimes(2);
  });
  test('should register an event listener and handle "delete" event type with passed cb function', async () => {
    const cb = jest.fn();
    const eventType = 'delete';
    runInteractions(cb, eventType);

    expect(cb).toBeCalledTimes(2);
    expect(reload).not.toBeCalled();
  });
  test('should register an event listener and handle "delete" event type with passed "reload" string as cb value', async () => {
    const cb = 'reload';
    const eventType = 'delete';

    runInteractions(cb, eventType);

    expect(reload).toBeCalledTimes(2);
  });
  test('should register an event listener and handle "change" event type with passed cb function', async () => {
    const cb = jest.fn();
    const eventType = 'change';

    runInteractions(cb, eventType);

    expect(cb).toBeCalledTimes(2);
    expect(reload).not.toBeCalled();
  });
  test('should register an event listener and handle "change" event type with passed "reload" string as cb value', async () => {
    const cb = 'reload';
    const eventType = 'change';

    runInteractions(cb, eventType);

    expect(reload).toBeCalledTimes(2);
  });
});
