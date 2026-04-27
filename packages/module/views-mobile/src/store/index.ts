import { inferStoreContext } from '@lace-contract/module';
export type * from './init';

export default inferStoreContext({
  load: async () => import('./init'),
  context: {
    actions: {},
    selectors: {},
  },
});
