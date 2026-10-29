/**
 * The outcome of an operation whose failure the caller is expected to handle.
 * Plain data with no class instances. Payloads may hold `bigint`, so convert
 * them before putting them in a Redux action or JSON.
 */
export type CustodyResult<T, E> =
  | { readonly error: E; readonly ok: false }
  | { readonly ok: true; readonly value: T };

export const ok = <T>(value: T): CustodyResult<T, never> => ({
  ok: true,
  value,
});

export const fail = <E>(error: E): CustodyResult<never, E> => ({
  ok: false,
  error,
});
