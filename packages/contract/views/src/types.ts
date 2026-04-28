import type * as React from 'react';

import type {
  State,
  Action,
  DynamicallyLoadedInit,
  ViewId,
  WithLaceContext,
} from '@lace-contract/module';
import type { Store } from '@reduxjs/toolkit';

export type ViewType = 'mobile' | 'popupWindow' | 'sidePanel';
// not 'Tagged' to be compatible with 'history' package
export type ViewLocation = string;

export type View = {
  id: ViewId;
  location: ViewLocation;
  type: ViewType;
  /** Browser window ID. Present on extension views (sidePanel, popupWindow). */
  windowId?: number;
};

export interface RenderSpecification {
  readonly id: string;
}

export interface Render<Props extends object = object> {
  readonly Component: React.ComponentType<Props>;
  readonly key: string;
  readonly locationPattern?: RegExp;
}

export type RenderRootMap = Partial<
  Record<ViewType, DynamicallyLoadedInit<Render[]>>
>;

export type InitializeExtensionView = (
  store: Store<State, Action>,
  laceContext: WithLaceContext<unknown, unknown>,
) => Promise<void> | void;
