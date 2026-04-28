import { NetworkSelectionSheet } from '@lace-lib/ui-toolkit';
import React from 'react';

import { useNetworkSheet } from './useNetworkSheet';

import type { SheetRoutes, SheetScreenProps } from '@lace-lib/navigation';

export const NetworkSheet = (
  _: SheetScreenProps<SheetRoutes.NetworkSelection>,
) => {
  const networkSheetProps = useNetworkSheet();

  return <NetworkSelectionSheet {...networkSheetProps} />;
};
