import { loadedActionCreators, loadedSelectors } from '@lace-contract/module';
import {
  createUseDispatchLaceAction,
  createUseLaceSelectorHook,
  createContextualUseLoadModules,
} from '@lace-lib/util-render';

import type { ActionCreators, AvailableAddons, Selectors } from '..';
import type { UseLaceSelectorHook } from '@lace-lib/util-render';

export const useLaceSelector: UseLaceSelectorHook<Selectors> =
  createUseLaceSelectorHook<Selectors>(loadedSelectors);

export const useDispatchLaceAction =
  createUseDispatchLaceAction<ActionCreators>(loadedActionCreators);

export const useContextualLoadModules =
  createContextualUseLoadModules<AvailableAddons>();
