import { loadedActionCreators, loadedSelectors } from '@lace-contract/module';
import {
  createUseDispatchLaceAction,
  createUseLaceSelectorHook,
} from '@lace-lib/util-render';

import type { UseLaceSelectorHook } from '@lace-lib/util-render';
import type { ActionCreators, Selectors } from '@lace-module/app-mobile';

export const useLaceSelector: UseLaceSelectorHook<Selectors> =
  createUseLaceSelectorHook<Selectors>(loadedSelectors);

export const useDispatchLaceAction =
  createUseDispatchLaceAction<ActionCreators>(loadedActionCreators);
