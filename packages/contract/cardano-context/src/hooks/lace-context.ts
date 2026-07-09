/* eslint-disable @typescript-eslint/no-explicit-any */
import { loadedSelectors } from '@lace-contract/module';
import { createUseLaceSelectorHook } from '@lace-lib/util-render';

/**
 * Contract-scoped `useLaceSelector` typed generically. Contracts don't own a
 * module-specific selector map, so the type parameter is intentionally `any`
 * here — callers still pass string keys ("scope.selectorName") and receive
 * `unknown`, and we narrow at usage sites where the concrete selector shape
 * is known. Used by shared UI shipped from this package (e.g. the
 * `security-alerts` chip / disclosure / inline compound) that has to read the
 * cardano-context flagged-exploits state without depending on any particular
 * consuming module.
 */
export const useLaceSelector = createUseLaceSelectorHook<any>(loadedSelectors);
