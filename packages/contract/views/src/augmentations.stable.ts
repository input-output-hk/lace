// The stable SDK build resolves this file in place of augmentations.ts: the
// SDK runs headless, so the views contract adds its state and no view or page
// addon.
import type { ViewsStoreState } from './store/slice';

declare module '@lace-contract/module' {
  interface State extends ViewsStoreState {}
}
