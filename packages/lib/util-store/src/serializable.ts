import {
  fromSerializableObject,
  toSerializableObject,
} from '@cardano-sdk/util';

declare const opaque: unique symbol;

export type Serializable<T> = {
  readonly [opaque]: T;
};

const options = { transformationTypeKey: '__storeSerializedType' };

// Cache for fromCached(): serialized input → frozen deserialized output
const deserializationCache = new WeakMap<object, unknown>();

// Deep freeze helper to make cached objects immutable
const deepFreeze = <T>(object: T): T => {
  if (object && typeof object === 'object' && !Object.isFrozen(object)) {
    Object.freeze(object);
    Object.values(object).forEach(deepFreeze);
  }
  return object;
};

export const Serializable = {
  // no caching, returns mutable object (safe for reducers)
  from: <T>(input: Serializable<T>): T =>
    fromSerializableObject<T>(input, options),

  // Cached + frozen version for selectors - returns stable references
  // Note: objects are frozen at runtime but typed as mutable for SDK compatibility
  fromCached: <T>(input: Serializable<T>): T => {
    if (input && typeof input === 'object' && deserializationCache.has(input)) {
      return deserializationCache.get(input) as T;
    }

    const result = fromSerializableObject<T>(input, options);

    if (input && typeof input === 'object') {
      deepFreeze(result);
      deserializationCache.set(input, result);
    }

    return result;
  },

  to: <T>(input: T): Serializable<T> =>
    toSerializableObject(input, options) as Serializable<T>,
};
