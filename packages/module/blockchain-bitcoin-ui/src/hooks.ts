import { loadedActionCreators, loadedSelectors } from '@lace-contract/module';
import {
  createUseDispatchLaceAction,
  createUseLaceSelectorHook,
} from '@lace-lib/util-render';

import type { ActionCreators, Selectors } from '.';

export const useLaceSelector =
  createUseLaceSelectorHook<Selectors>(loadedSelectors);

export const useDispatchLaceAction =
  createUseDispatchLaceAction<ActionCreators>(loadedActionCreators);
