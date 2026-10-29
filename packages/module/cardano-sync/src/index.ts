import { cardanoSyncModule } from './module';

import type { LaceModuleMap } from '@lace-contract/module';

export { cardanoSyncModule } from './module';
export type {
  ActionCreators,
  CardanoSyncAction,
  Selectors,
  SideEffect,
} from './module';

const moduleMap: LaceModuleMap = {
  'lace-extension': cardanoSyncModule,
  'lace-mobile': cardanoSyncModule,
  'lace-extension-carbon': cardanoSyncModule,
  'lace-extension-guest': cardanoSyncModule,
};

export default moduleMap;
