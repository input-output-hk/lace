export type SelectInnerProperty<T, K extends keyof T, L extends keyof K> = {
  [P in L]: T[K];
};

export type ArrayLengthMutationKeys = 'splice' | 'push' | 'pop' | 'shift' | 'unshift' | number;

export type ArrayItems<T extends Array<unknown>> = T extends Array<infer TItems> ? TItems : never;

export type FixedLengthArray<T extends unknown[]> = Pick<T, Exclude<keyof T, ArrayLengthMutationKeys>> & {
  [Symbol.iterator]: () => IterableIterator<ArrayItems<T>>;
};
