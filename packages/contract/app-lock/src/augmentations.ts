import type { ActivityChannelExtension } from './report-activity-channel';
import type { appLockReducers } from './store';
import type { SetupAppLock } from './types';
import type { DynamicallyLoadedInit } from '@lace-contract/module';
import type { StateFromReducersMapObject } from '@reduxjs/toolkit';

declare module '@lace-contract/module' {
  interface State extends StateFromReducersMapObject<typeof appLockReducers> {}

  interface LaceAddons {
    readonly loadSetupAppLock: DynamicallyLoadedInit<SetupAppLock>;
    readonly loadActivityChannelExtension: DynamicallyLoadedInit<ActivityChannelExtension>;
  }
}
