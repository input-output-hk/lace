import { CustomizeAccountSheet } from '@lace-lib/ui-toolkit';
import React from 'react';

import { useCustomizeAccount } from './useCustomizeAccount';

import type { SheetRoutes, SheetScreenProps } from '@lace-lib/navigation';

export const CustomizeAccount = (
  props: SheetScreenProps<SheetRoutes.CustomizeAccount>,
) => {
  const { actions, copies, utils } = useCustomizeAccount(props);

  return (
    <CustomizeAccountSheet actions={actions} copies={copies} utils={utils} />
  );
};
