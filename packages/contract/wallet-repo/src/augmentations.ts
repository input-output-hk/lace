import type { WalletsState } from './store/init';

declare module '@lace-contract/module' {
  interface State extends WalletsState {}
}
