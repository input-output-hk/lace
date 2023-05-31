import { usePriceFetcher } from '@lace/core';

export type PromiseResolvedType<T> = T extends (...args: unknown[]) => Promise<infer R> ? R : never;

export type IViewsList<T extends string | number | symbol> = Partial<Record<T, () => React.ReactElement>>;

export type FetchPriceState = ReturnType<typeof usePriceFetcher>['result'];

export interface ValidationResult {
  message?: string;
  valid: boolean;
}
