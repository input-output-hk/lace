import type { ModuleLoader } from './create-module-loader';
import type {
  ScopedActionCreators,
  ScopedSelectors,
  WithLaceContext,
} from './types';

/** The selectors of every loaded module store, keyed by store scope. */
export type LoadedSelectors = ScopedSelectors;
/** The action creators of every loaded module store, keyed by store scope. */
export type LoadedActionCreators = Partial<ScopedActionCreators>;

/**
 * Process-wide registry of loaded selectors. Empty until {@link initLaceContext}
 * fills it; the same object is mutated in place, so references taken earlier
 * see the loaded selectors afterwards.
 */
export const loadedSelectors: LoadedSelectors = {};
/**
 * Process-wide registry of loaded action creators. Empty until
 * {@link initLaceContext} fills it; the same object is mutated in place, so
 * references taken earlier see the loaded action creators afterwards.
 */
export const loadedActionCreators: LoadedActionCreators = {};

/**
 * Loads every module store and registers its selectors and action creators in
 * {@link loadedSelectors} and {@link loadedActionCreators}.
 *
 * @param loadModules - The module loader of the running app.
 * @returns The populated registries, typed as `Selectors` and `ActionCreators`.
 */
export const initLaceContext = async <
  Selectors extends LoadedSelectors = LoadedSelectors,
  ActionCreators extends LoadedActionCreators = LoadedActionCreators,
>(
  loadModules: ModuleLoader,
) => {
  const stores = await loadModules('store');
  for (const store of stores) {
    Object.assign(loadedSelectors, store.context.selectors);
    Object.assign(loadedActionCreators, store.context.actions);
  }
  return {
    selectors: loadedSelectors as Selectors,
    actions: loadedActionCreators as ActionCreators,
  };
};

/**
 * Narrows an untyped lace context (its `selectors` and `actions`) to the given
 * selector and action-creator types. A type assertion only; the value is
 * returned unchanged.
 */
export const typedLaceContext = <Selectors, ActionCreators>(
  context: WithLaceContext,
) => context as WithLaceContext<Selectors, ActionCreators>;
