import type { TokensStoreState } from './store';

declare module '@lace-contract/module' {
  interface State extends TokensStoreState {}
}
