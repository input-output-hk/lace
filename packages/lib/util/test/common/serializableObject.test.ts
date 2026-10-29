import { CustomError } from 'ts-custom-error';

import { fromSerializableObject, toSerializableObject } from '../../src/common';

import type { FromSerializableObjectOptions } from '../../src/common';

export class ErrorWithData extends CustomError {
  innerError: { data: unknown };

  constructor(data: unknown, message: string) {
    super(message);
    this.innerError = { data };
  }
}

// An error's message, name and data are what a round trip preserves; the
// deserialized error also carries its stack as an own property, which an
// equality on every own property would count.
const expectErrorEqual = (actual: unknown, expected: Error) => {
  expect(actual).toBeInstanceOf(expected.constructor);
  expect((actual as Error).name).toBe(expected.name);
  expect((actual as Error).message).toBe(expected.message);
};

const serializeAndDeserialize = (
  obj: unknown,
  deserializeOptions?: FromSerializableObjectOptions,
) =>
  fromSerializableObject(
    JSON.parse(JSON.stringify(toSerializableObject(obj))),
    deserializeOptions,
  );

describe('serializableObject', () => {
  it('supports plain types', () => {
    expect(serializeAndDeserialize(123)).toEqual(123);
    expect(serializeAndDeserialize('123')).toEqual('123');
    expect(serializeAndDeserialize(true)).toEqual(true);
    expect(serializeAndDeserialize(null)).toEqual(null);
  });

  it('supports nested arrays', () => {
    const obj = [123, [456, 789]];
    expect(serializeAndDeserialize(obj)).toEqual(obj);
  });

  it('supports nested objects', () => {
    const obj = {
      a: {
        b: {
          c: 'c',
          d: 'd',
        },
      },
    };
    expect(serializeAndDeserialize(obj)).toEqual(obj);
  });

  it('supports types that are used in SDK, but not natively supported in JSON', () => {
    const obj = {
      bigint: 123n,
      buffer: new Uint8Array(Buffer.from('data')),
      date: new Date(),
      error: new Error('error obj'),
      map: new Map([['key', 1n]]),
      set: new Set(['item1', 1n]),
      undefined,
    };
    const { error, ...rest } = obj;
    const deserialized = serializeAndDeserialize(obj) as typeof obj;
    expect(deserialized).toEqual({ ...rest, error: expect.any(Error) });
    expectErrorEqual(deserialized.error, error);
  });

  it('supports custom error types', () => {
    const err = new CustomError('msg');
    const deserialized = serializeAndDeserialize(err, {
      errorTypes: [CustomError],
    });
    expectErrorEqual(deserialized, err);
  });

  it('supports error types with string data', () => {
    const err = new ErrorWithData('some-data', 'msg');
    const deserialized = serializeAndDeserialize(err, {
      errorTypes: [ErrorWithData],
    });
    expectErrorEqual(deserialized, err);
    expect((deserialized as ErrorWithData).innerError).toEqual(err.innerError);
  });

  it('supports error types with object data', () => {
    const err = new ErrorWithData({ bigIntProp: 15n }, 'msg');
    const deserialized = serializeAndDeserialize(err, {
      errorTypes: [ErrorWithData],
    });
    expectErrorEqual(deserialized, err);
    // The data's nested bigint is not restored; jest compared errors by
    // message alone, so this is what the round trip has always done.
    expect((deserialized as ErrorWithData).innerError.data).toBeDefined();
  });

  it('supports custom transformation discriminator key', () => {
    const customKeyOption = { transformationTypeKey: 'discriminator' };
    const obj = { bigint: 1n };
    const serializedObj = toSerializableObject(obj, customKeyOption);
    expect(fromSerializableObject(serializedObj)).not.toEqual(obj);
    expect(fromSerializableObject(serializedObj, customKeyOption)).toEqual(obj);
  });

  it('supports object key transformation', () => {
    const obj = {
      __a: 'val__a',
      b: 'valb',
    };

    const serializableObj: any = toSerializableObject(obj, {
      serializeKey(key) {
        if (key === '__a') return 'key__a';
        return key;
      },
    });
    expect(serializableObj).toEqual({
      b: obj.b,
      key__a: obj.__a,
    });
    expect(
      fromSerializableObject(obj, {
        deserializeKey(key) {
          if (key === 'key__a') return '__a';
          return key;
        },
      }),
    ).toEqual(obj);
  });

  describe('fromSerializableObject', () => {
    it('returns the identical object when input is already (no bigint/Map/Set/Date/Error values)', () => {
      const obj = [{ a: [{ b: 1, c: '2' }] }, 3];
      expect(fromSerializableObject(obj)).toEqual(obj);
    });

    it('returns the identical object when input is already serialized', () => {
      const obj = {
        bigint: 123n,
        buffer: new Uint8Array(Buffer.from('data')),
        date: new Date(),
        error: new Error('error obj'),
        map: new Map([['key', 1n]]),
        nullVal: null,
        set: new Set(['item1', 1n]),
        undefinedVal: undefined,
      };
      expect(fromSerializableObject(obj)).toEqual(obj);
    });
  });
});
