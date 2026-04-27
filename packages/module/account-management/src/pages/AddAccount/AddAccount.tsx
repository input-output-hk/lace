import { type SheetScreenProps } from '@lace-lib/navigation';
import { AddAccountSheet as AddAccountSheetTemplate } from '@lace-lib/ui-toolkit';
import React from 'react';

import { useAddAccount } from './useAddAccount';

import type { SheetRoutes } from '@lace-lib/navigation';

export const AddAccount = (props: SheetScreenProps<SheetRoutes.AddAccount>) => {
  const { secondaryButton, primaryButton, ...sheetProps } =
    useAddAccount(props);

  return (
    <AddAccountSheetTemplate
      {...sheetProps}
      secondaryButton={secondaryButton}
      primaryButton={primaryButton}
    />
  );
};
