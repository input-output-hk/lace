// The stable SDK build resolves this file in place of app-context.ts: the
// stable SDK's modules declare no app-context initializer, so there is none to
// run.
import type { createModuleLoader } from '@lace-contract/module';

/** Runs the app-context initializers the loaded modules provide: none. */
export const initializeAppContext = async (
  _loadModules: ReturnType<typeof createModuleLoader>,
): Promise<void> => {};
