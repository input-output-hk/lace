import { loadedActionCreators } from '@lace-contract/module';
import { createUseDispatchLaceAction } from '@lace-lib/util-render';

import type { ActionCreators } from './index';

export const useDispatchLaceAction =
  createUseDispatchLaceAction<ActionCreators>(loadedActionCreators);
