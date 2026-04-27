import type { ModuleLoader } from './create-module-loader';
import type {
  ScopedActionCreators,
  ScopedSelectors,
  WithLaceContext,
} from './types';

export type LoadedSelectors = ScopedSelectors;
export type LoadedActionCreators = Partial<ScopedActionCreators>;

export const loadedSelectors: LoadedSelectors = {};
export const loadedActionCreators: LoadedActionCreators = {};

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

export const typedLaceContext = <Selectors, ActionCreators>(
  context: WithLaceContext,
) => context as WithLaceContext<Selectors, ActionCreators>;
