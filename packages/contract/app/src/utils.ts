import type { InitializeAppContext } from './types';

export const runInitializers = async (initializers: InitializeAppContext[]) =>
  Promise.all(initializers.map(async initializer => initializer()));
