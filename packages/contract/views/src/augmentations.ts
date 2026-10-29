// The stable SDK build resolves augmentations.stable.ts in place of this file,
// which adds the state and no view or page addon.
// Keep the two files' exports in step, apart from the names the variant
// declares on stable-omits lines; the SDK's stable variant parity check
// enforces it.

import type * as React from 'react';

import type { ViewsStoreState } from './store/slice';
import type { InitializeExtensionView, RenderRootMap } from './types';
import type { DynamicallyLoadedInit } from '@lace-contract/module';
import type { LinkingOptions, ParamListBase } from '@react-navigation/native';

declare module '@lace-contract/module' {
  interface State extends ViewsStoreState {}

  interface LaceAddons {
    readonly loadInitializeExtensionView: DynamicallyLoadedInit<InitializeExtensionView>;
    readonly loadInitializeMobileView: DynamicallyLoadedInit<InitializeExtensionView>;
    readonly loadTabPages: DynamicallyLoadedInit<React.ReactNode>;
    readonly loadStackPages: DynamicallyLoadedInit<React.ReactNode>;
    readonly loadGlobalOverlays: DynamicallyLoadedInit<React.ReactNode>;
    readonly loadSheetPages: DynamicallyLoadedInit<React.ReactNode>;
    readonly loadMobileDeepLinks: DynamicallyLoadedInit<
      LinkingOptions<ParamListBase>
    >;
    readonly renderRoot: RenderRootMap;
  }
}
