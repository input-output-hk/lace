import { toSerializableObject } from '@cardano-sdk/util';

export const stringifyWithFallback = (
  value: unknown,
  fallbackValue = '<failed-to-stringify>'
): [string] | [string, Error] => {
  if (typeof value === 'string') return [value];
  try {
    return [JSON.stringify(toSerializableObject(value))];
  } catch (error) {
    return [fallbackValue, error];
  }
};
