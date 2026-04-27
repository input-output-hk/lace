import { promptMidnightAuthorizeDapp } from './authorize-dapp-util';
import { connectDappConnectorApi } from './side-effects';

import type { SideEffect } from '../index';
import type { LaceInitSync } from '@lace-contract/module';

export const initializeLaceExtensionSideEffects: LaceInitSync<
  SideEffect[]
> = () => {
  return [connectDappConnectorApi, promptMidnightAuthorizeDapp];
};
