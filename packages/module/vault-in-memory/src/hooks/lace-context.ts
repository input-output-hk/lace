import { loadedActionCreators, loadedSelectors } from '@lace-contract/module';
import {
  createContextualUseLoadModules,
  createUseDispatchLaceAction,
  createUseLaceSelectorHook,
} from '@lace-lib/util-render';

import type { AvailableAddons, ActionCreators, Selectors } from '../';
import type { UseLaceSelectorHook } from '@lace-lib/util-render';

export const useLaceSelector: UseLaceSelectorHook<Selectors> =
  createUseLaceSelectorHook<Selectors>(loadedSelectors);

export const useDispatchLaceAction =
  createUseDispatchLaceAction<ActionCreators>(loadedActionCreators);

// Context-aware useLoadModules hook scoped to this module's available addons
export const useLoadModules = createContextualUseLoadModules<AvailableAddons>();
