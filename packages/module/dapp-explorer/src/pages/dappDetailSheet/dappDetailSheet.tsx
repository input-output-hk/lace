import { DappDetailsSheet as DappDetailsSheetTemplate } from '@lace-lib/ui-toolkit';
import React from 'react';

import { useDappDetails } from './useDappDetails';

import type { SheetRoutes, SheetScreenProps } from '@lace-lib/navigation';

export const DappDetailSheet = (
  props: SheetScreenProps<SheetRoutes.DappDetail>,
) => {
  const { activeDapp } = props.route.params;
  const templateProps = useDappDetails(activeDapp);
  if (!templateProps) return null;
  return <DappDetailsSheetTemplate {...templateProps} />;
};
