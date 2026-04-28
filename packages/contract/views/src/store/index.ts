import { inferStoreContext } from '@lace-contract/module';

import { viewsActions, viewsSelectors } from './slice';
export { viewsActions, viewsSelectors } from './slice';

export * from './middleware';
export type {
  CallHistoryMethodPayload,
  HistoryMethod,
  ColorScheme,
  LocationChangedPayload,
  OpenViewPayload,
  ViewsSliceState,
  ViewsStoreState,
} from './slice';

export default inferStoreContext({
  load: async () => import('./init'),
  context: {
    actions: viewsActions,
    selectors: viewsSelectors,
  },
});
