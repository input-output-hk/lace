import type { reducers, uiActions } from './store/slice';
import type { StateFromReducersMapObject } from 'redux';

declare module '@lace-contract/module' {
  interface State extends StateFromReducersMapObject<typeof reducers> {}
  interface AppConfig {
    faqUrl: string;
  }
  interface ActionCreators {
    'lace-mobile': typeof uiActions;
  }
}
