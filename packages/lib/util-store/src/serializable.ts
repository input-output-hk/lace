import {
  fromSerializableObject,
  toSerializableObject,
} from '@cardano-sdk/util';

declare const opaque: unique symbol;

export type Serializable<T> = {
  readonly [opaque]: T;
};

const options = { transformationTypeKey: '__storeSerializedType' };

const deserializationCache = new WeakMap<object, unknown>();

export const Serializable = {
  // no caching, returns mutable object (safe for reducers)
  from: <T>(input: Serializable<T>): T =>
    fromSerializableObject<T>(input, options),

  // Cached version for selectors - returns stable references across calls
  fromCached: <T>(input: Serializable<T>): T => {
    if (input && typeof input === 'object' && deserializationCache.has(input)) {
      return deserializationCache.get(input) as T;
    }

    const result = fromSerializableObject<T>(input, options);

    if (input && typeof input === 'object') {
      deserializationCache.set(input, result);
    }

    return result;
  },

  to: <T>(input: T): Serializable<T> =>
    toSerializableObject(input, options) as Serializable<T>,
};
