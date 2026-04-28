import {
  PoolDetailsSheet,
  PoolDetailsSheetSkeleton,
} from '@lace-lib/ui-toolkit';
import React from 'react';

import { useStakePoolDetails } from './useStakePoolDetails';

import type { SheetRoutes, SheetScreenProps } from '@lace-lib/navigation';

export const StakePoolDetailsSheet = (
  props: SheetScreenProps<SheetRoutes.StakePoolDetails>,
) => {
  const stakePoolDetailsProps = useStakePoolDetails(props.route.params);

  if (!stakePoolDetailsProps) {
    return <PoolDetailsSheetSkeleton />;
  }

  return <PoolDetailsSheet {...stakePoolDetailsProps} />;
};
