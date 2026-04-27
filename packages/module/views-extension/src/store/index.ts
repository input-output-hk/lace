import { inferStoreContext } from '@lace-contract/module';
export type * from './dependencies';

export default inferStoreContext({
  load: async () => import('./init'),
  context: {
    actions: {},
    selectors: {},
  },
});
