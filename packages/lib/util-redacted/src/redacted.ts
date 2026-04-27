const RedactedSymbol = Symbol.for('@lace/Redacted');
const InspectSymbol = Symbol.for('nodejs.util.inspect.custom');
const RedactedTagKey = '__redacted';
const RedactedValueKey = '__redactedValue';

export type Redacted<A = string> = A & {
  readonly _tag: 'Redacted';
  readonly [RedactedSymbol]: A;
  readonly [RedactedTagKey]: true;
  readonly [RedactedValueKey]?: A;
  toString: () => string;
  toJSON: () => string;
  readonly [InspectSymbol]: () => string;
};

const redactedString = () => '[REDACTED]';

const decorateObject = <A extends object>(value: A): Redacted<A> => {
  Object.defineProperties(value, {
    _tag: { value: 'Redacted', configurable: true, enumerable: true },
    [RedactedSymbol]: { value, configurable: true },
    [RedactedTagKey]: { value: true, configurable: true, enumerable: true },
    toString: { value: redactedString, configurable: true },
    toJSON: { value: redactedString, configurable: true },
    [InspectSymbol]: { value: redactedString, configurable: true },
  });

  return value as Redacted<A>;
};

export const make = <A>(value: A): Redacted<A> => {
  if (typeof value === 'object' && value !== null) {
    return decorateObject(value);
  }

  return {
    _tag: 'Redacted' as const,
    [RedactedSymbol]: value,
    [RedactedTagKey]: true,
    [RedactedValueKey]: value,
    toString: redactedString,
    toJSON: redactedString,
    [InspectSymbol]: redactedString,
  } as Redacted<A>;
};

export const value = <A>(self: Redacted<A>): A => {
  if (RedactedSymbol in (self as object)) {
    return self[RedactedSymbol];
  }

  if (RedactedValueKey in (self as object)) {
    return (self as { [RedactedValueKey]?: A })[RedactedValueKey] as A;
  }

  return self as unknown as A;
};

export const unsafeWipe = <A>(self: Redacted<A>): void => {
  const current = value(self);

  if (current instanceof Uint8Array) {
    current.fill(0);
  } else if (typeof Buffer !== 'undefined' && Buffer.isBuffer(current)) {
    current.fill(0);
  }

  delete (self as { [RedactedSymbol]?: A })[RedactedSymbol];
  delete (self as { [RedactedValueKey]?: A })[RedactedValueKey];
};

export const isRedacted = (value: unknown): value is Redacted<unknown> =>
  typeof value === 'object' &&
  value !== null &&
  (('_tag' in value && (value as { _tag?: string })._tag === 'Redacted') ||
    RedactedTagKey in value);

export const filterRedacted = (value: unknown): unknown => {
  if (isRedacted(value)) return '[REDACTED]';
  if (typeof value !== 'object' || value === null) return value;
  if (Array.isArray(value)) return value.map(filterRedacted);

  const filtered: Record<string, unknown> = {};

  for (const key in value) {
    filtered[key] = filterRedacted((value as Record<string, unknown>)[key]);
  }

  return filtered;
};

export const Redacted = {
  make,
  value,
  unsafeWipe,
  isRedacted,
  filterRedacted,
} as const;
