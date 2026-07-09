import {
  handleError,
  handleSheetClose,
  makeHandleSearching,
} from './connection-flow';
import { handleMobileConnectionRequest } from './handle-mobile-connection-request';

import type { SideEffect } from '../..';
import type { LaceInit } from '@lace-contract/module';

export const initializeSideEffects: LaceInit<SideEffect[]> = async ({
  loadModules,
}) => {
  const loadedSearchDevices = await loadModules('addons.loadSearchHWDevices');

  return [
    handleMobileConnectionRequest,
    makeHandleSearching(loadedSearchDevices),
    handleError,
    handleSheetClose,
  ];
};
