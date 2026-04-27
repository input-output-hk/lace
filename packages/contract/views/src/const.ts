import { ViewId } from '@lace-contract/module';

/** Deterministic view ID for side panels — both SW and UI derive the same ID. */
export const SidePanelViewId = (windowId: number) =>
  ViewId(`sidePanel-${windowId}`);
export const MOBILE_VIEW_ID = ViewId('mobile');
export const REQUIRED_SYNC_PERCENTAGE = 1;
