// The stable SDK build resolves app-context.stable.ts in place of this file,
// which runs no initializer. Keep the two files' exports in step, apart from
// the names the variant declares on stable-omits lines; the SDK's stable
// variant parity check enforces it.
import { runInitializers } from '@lace-contract/app';

import type { createModuleLoader } from '@lace-contract/module';

/** Runs the app-context initializers the loaded modules provide, such as i18n. */
export const initializeAppContext = async (
  loadModules: ReturnType<typeof createModuleLoader>,
): Promise<void> => {
  const initializers = await loadModules('addons.loadInitializeAppContext');
  await runInitializers(initializers);
};
