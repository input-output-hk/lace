import { CreateWalletSheetTemplate } from '@lace-lib/ui-toolkit';
import React from 'react';

import { useCreateNewWallet } from './useCreateNewWallet';

import type { SheetRoutes, SheetScreenProps } from '@lace-lib/navigation';

export const CreateNewWallet = (
  props: SheetScreenProps<SheetRoutes.CreateNewWallet>,
) => {
  const templateProps = useCreateNewWallet(props);

  return <CreateWalletSheetTemplate {...templateProps} />;
};

export default CreateNewWallet;
