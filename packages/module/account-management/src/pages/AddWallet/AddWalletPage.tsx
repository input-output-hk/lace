import { AddWalletPageTemplate } from '@lace-lib/ui-toolkit';
import React from 'react';

import { useAddWalletPage } from './useAddWalletPage';

import type { StackRoutes, StackScreenProps } from '@lace-lib/navigation';

export const AddWalletPage = (
  props: StackScreenProps<StackRoutes.AddWallet>,
) => {
  const templateProps = useAddWalletPage(props);

  return <AddWalletPageTemplate {...templateProps} />;
};

export default AddWalletPage;
