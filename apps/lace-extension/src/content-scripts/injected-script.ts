import { createInjectedRuntime } from '@lace-sdk/extension-messaging';
import '@lace-contract/dapp-connector';

import { createContentScriptModuleLoader, logger } from '../util';

const runtime = createInjectedRuntime(location.origin);

const loadModules = createContentScriptModuleLoader();
const moduleApis = await loadModules('addons.dappConnectorApi');

const injectDependencies = { logger, runtime };
for (const api of moduleApis) {
  api.inject(injectDependencies);
}
