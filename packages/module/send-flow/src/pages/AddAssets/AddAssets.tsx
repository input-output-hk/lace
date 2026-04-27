import { AddAssetsTemplate } from '@lace-lib/ui-toolkit';
import React from 'react';

import { useAddAssets } from './useAddAssets';

import type { SheetRoutes, SheetScreenProps } from '@lace-lib/navigation';

export const AddAssets = (props: SheetScreenProps<SheetRoutes.AddAssets>) => {
  const { accountId, blockchainName } = props.route.params;
  const { labels, actions, values } = useAddAssets(accountId, blockchainName);

  return (
    <AddAssetsTemplate labels={labels} actions={actions} values={values} />
  );
};
