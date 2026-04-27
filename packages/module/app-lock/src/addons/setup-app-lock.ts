import { createObservableHook } from '@lace-lib/util-store';

import type { SetupAppLock } from '@lace-contract/app-lock';

export const appLockSetupHook = createObservableHook<SetupAppLock>();

const loadSetupAppLock = (): SetupAppLock => appLockSetupHook.trigger;

export default loadSetupAppLock;
