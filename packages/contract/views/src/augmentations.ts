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
