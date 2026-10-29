// The stable SDK build resolves this file in place of augmentations.ts: the
// SDK runs headless, so the app contract adds its reload dependency and no UI
// customisation addon.
import type { Observable } from 'rxjs';

declare module '@lace-contract/module' {
  interface SideEffectDependencies {
    performAppReload: () => Observable<void>;
  }
}
