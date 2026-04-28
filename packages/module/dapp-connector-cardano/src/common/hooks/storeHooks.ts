import { loadedActionCreators, loadedSelectors } from '@lace-contract/module';
import {
  createUseDispatchLaceAction,
  createUseLaceSelectorHook,
} from '@lace-lib/util-render';

import type { ActionCreators, Selectors } from '../../index';
import type { UseLaceSelectorHook } from '@lace-lib/util-render';

/**
 * Hook for selecting state from the Lace Redux store.
 * Typed specifically for the dApp connector module's available selectors.
 */
export const useLaceSelector: UseLaceSelectorHook<Selectors> =
  createUseLaceSelectorHook<Selectors>(loadedSelectors);

/**
 * Hook for dispatching actions to the Lace Redux store.
 * Typed specifically for the dApp connector module's available action creators.
 */
export const useDispatchLaceAction =
  createUseDispatchLaceAction<ActionCreators>(loadedActionCreators);
