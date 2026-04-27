import { EditWalletSheetTemplate } from '@lace-lib/ui-toolkit';
import React from 'react';

import { useEditWallet } from './useEditWallet';

import type { SheetRoutes, SheetScreenProps } from '@lace-lib/navigation';

export const EditWalletSheet = (
  props: SheetScreenProps<SheetRoutes.EditWallet>,
) => {
  const { secondaryButton, primaryButton, ...templateProps } =
    useEditWallet(props);

  return (
    <EditWalletSheetTemplate
      {...templateProps}
      secondaryButton={secondaryButton}
      primaryButton={primaryButton}
    />
  );
};
